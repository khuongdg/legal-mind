import fs from "fs";
import path from "path";
import { getDbPool } from "./client";

export async function runMigrations() {
  const pool = getDbPool();
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  console.log("🚀 Running Legal-Mind Database Migrations...");
  try {
    await pool.query(sql);
    console.log("✅ Migrations applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.main || require.main === module) {
  runMigrations();
}
