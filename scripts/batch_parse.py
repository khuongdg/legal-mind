#!/usr/bin/env python3
"""Parse configured legal sources into one JSON file per law."""

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml

from parse_law_doc import run_pipeline


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = ROOT_DIR / "scripts" / "laws_config.yaml"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "scripts" / "data"
SUPPORTED_TYPES = {"BO_LUAT", "LUAT", "NGHI_DINH", "THONG_TU", "AN_LE"}
SUPPORTED_AUTHORITIES = {"QUOC_HOI", "CHINH_PHU", "TOA_AN_TOI_CAO", "BO_TU_PHAP"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate_manifest(data: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not isinstance(data, dict):
        fail("Manifest root must be a YAML object.")
    if data.get("configVersion") != 1:
        fail("configVersion must be 1.")

    collections = data.get("collections")
    laws = data.get("laws")
    if not isinstance(collections, list) or not isinstance(laws, list):
        fail("Manifest must define collections and laws as lists.")

    collection_ids: set[str] = set()
    for collection in collections:
        if not isinstance(collection, dict) or not collection.get("id"):
            fail("Each collection must be an object with a non-empty id.")
        collection_id = collection["id"]
        if collection_id in collection_ids:
            fail(f"Duplicate collection id: {collection_id}")
        if not collection.get("name"):
            fail(f"Collection {collection_id} is missing name.")
        collection_ids.add(collection_id)

    law_ids: set[str] = set()
    required_fields = (
        "id", "title", "code", "type", "authority", "issuedDate",
        "effectiveDate", "status", "officialUrl", "collections", "sources",
    )
    for law in laws:
        if not isinstance(law, dict):
            fail("Each law entry must be an object.")
        missing = [field for field in required_fields if field not in law]
        if missing:
            fail(f"Law entry is missing fields: {', '.join(missing)}")

        law_id = law["id"]
        if not isinstance(law_id, str) or not law_id.strip() or "/" in law_id or "\\" in law_id:
            fail("Each law must have a non-empty string id.")
        if law_id in law_ids:
            fail(f"Duplicate law id: {law_id}")
        law_ids.add(law_id)

        if law["type"] not in SUPPORTED_TYPES:
            fail(f"Law {law_id} has unsupported type: {law['type']}")
        if law["authority"] not in SUPPORTED_AUTHORITIES:
            fail(f"Law {law_id} has unsupported authority: {law['authority']}")
        if not isinstance(law["collections"], list) or not law["collections"]:
            fail(f"Law {law_id} must belong to at least one collection.")
        unknown_collections = set(law["collections"]) - collection_ids
        if unknown_collections:
            fail(f"Law {law_id} references unknown collections: {', '.join(sorted(unknown_collections))}")
        if not isinstance(law["sources"], list) or not law["sources"]:
            fail(f"Law {law_id} must define at least one source.")

    return laws, collections


def resolve_sources(law: dict[str, Any]) -> list[Path]:
    sources = law["sources"]
    paths: list[Path] = []
    parts: list[int] = []

    for source in sources:
        if not isinstance(source, dict) or not isinstance(source.get("path"), str):
            fail(f"Law {law['id']} has a source without a string path.")
        source_path = source["path"].strip()
        if not source_path:
            fail(f"Law {law['id']} has an empty source path; fill it in laws_config.yaml.")
        path = Path(source_path).expanduser()
        if not path.is_absolute():
            path = ROOT_DIR / path
        if not path.is_file():
            fail(f"Source file for {law['id']} does not exist: {path}")
        paths.append(path)

        part = source.get("part")
        if part is not None:
            if not isinstance(part, int) or part < 1:
                fail(f"Source part for {law['id']} must be a positive integer.")
            parts.append(part)

    if len(paths) > 1:
        if len(parts) != len(paths):
            fail(f"Law {law['id']} has multiple sources; add part to every source.")
        if len(set(parts)) != len(parts):
            fail(f"Law {law['id']} has duplicate source part numbers.")
        paths = [path for _, path in sorted(zip(parts, paths))]

    extensions = {path.suffix.lower() for path in paths}
    if len(extensions) != 1:
        fail(f"Law {law['id']} mixes source formats; use a single format per law.")
    extension = next(iter(extensions))
    if extension == ".docx" and len(paths) > 1:
        fail(f"Law {law['id']} has multiple DOCX sources; merge them before parsing.")
    if extension not in {".docx", ".pdf"}:
        fail(f"Law {law['id']} has unsupported source format {extension}; use DOCX or PDF.")

    return paths


def parse_law(law: dict[str, Any], output_dir: Path, parser_profile: str) -> Path:
    source_paths = resolve_sources(law)
    fingerprint = hashlib.sha256()
    fingerprint.update(parser_profile.encode("utf-8"))
    fingerprint.update(Path(__file__).with_name("parse_law_doc.py").read_bytes())
    fingerprint.update(law["title"].encode("utf-8"))
    fingerprint.update(law["code"].encode("utf-8"))
    for source_path in source_paths:
        fingerprint.update(source_path.name.encode("utf-8"))
        fingerprint.update(source_path.read_bytes())

    parsed = run_pipeline(
        input_files=[str(path) for path in source_paths],
        doc_id=law["id"],
        doc_title=law["title"],
        code_number=law["code"],
        document_type=law["type"],
        issuing_authority=law["authority"],
        issued_date=law["issuedDate"],
        effective_date=law["effectiveDate"],
        official_source_url=law["officialUrl"],
        status=law["status"],
    )
    parsed["collections"] = law["collections"]
    parsed["sourceHash"] = fingerprint.hexdigest()

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{law['id']}.json"
    output_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return output_path


def has_unconfigured_sources(law: dict[str, Any]) -> bool:
    paths = [source.get("path", "").strip() for source in law["sources"]]
    if all(not path for path in paths):
        return True
    if any(not path for path in paths):
        fail(f"Law {law['id']} mixes configured and empty source paths.")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse laws listed in laws_config.yaml into JSON files.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="Path to YAML manifest.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory for parsed JSON.")
    parser.add_argument("--law", action="append", dest="law_ids", help="Law ID to parse; may be repeated.")
    args = parser.parse_args()

    config_path = args.config.expanduser()
    if not config_path.is_absolute():
        config_path = Path.cwd() / config_path
    output_dir = args.output_dir.expanduser()
    if not output_dir.is_absolute():
        output_dir = Path.cwd() / output_dir

    try:
        with config_path.open(encoding="utf-8") as config_file:
            manifest = yaml.safe_load(config_file)
        laws, collections = validate_manifest(manifest)

        if args.law_ids:
            requested_ids = set(args.law_ids)
            known_ids = {law["id"] for law in laws}
            unknown_ids = requested_ids - known_ids
            if unknown_ids:
                fail(f"Unknown law IDs: {', '.join(sorted(unknown_ids))}")
            laws = [law for law in laws if law["id"] in requested_ids]

        output_dir.mkdir(parents=True, exist_ok=True)
        handoff_path = output_dir / "ingest-manifest.json"
        handoff_path.unlink(missing_ok=True)

        parsed_count = 0
        skipped_count = 0
        failures = 0
        parsed_ids: list[str] = []
        parser_profile = manifest.get("defaults", {}).get("parserProfile", "vietnamese-legal-v1")
        for law in laws:
            if has_unconfigured_sources(law):
                skipped_count += 1
                print(f"\nSkipping {law['id']} — {law['title']}: no source path configured.")
                continue

            print(f"\nParsing {law['id']} — {law['title']}")
            try:
                output_path = parse_law(law, output_dir, parser_profile)
                print(f"Created {output_path.relative_to(ROOT_DIR) if output_path.is_relative_to(ROOT_DIR) else output_path}")
                parsed_count += 1
                parsed_ids.append(law["id"])
            except Exception as error:
                failures += 1
                print(f"ERROR {law['id']}: {error}", file=sys.stderr)

        print(
            f"\nBatch complete: {parsed_count} parsed, "
            f"{skipped_count} skipped, {failures} failed."
        )
        if failures == 0:
            handoff = {
                "configVersion": manifest["configVersion"],
                "collections": collections,
                "lawIds": parsed_ids,
            }
            handoff_path.write_text(
                json.dumps(handoff, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        return 1 if failures else 0
    except (OSError, yaml.YAMLError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())