import { clientEnvSchema, type ClientEnv } from "./schema";

let cachedClientEnv: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  const importMetaEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;
  const runtimeEnv = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;
  const envData = {
    VITE_API_URL: importMetaEnv?.VITE_API_URL || runtimeEnv?.VITE_API_URL || "http://localhost:3001",
  };

  const result = clientEnvSchema.safeParse(envData);
  if (!result.success) {
    console.error("❌ Invalid client environment variables:", result.error.format());
    throw new Error("Invalid client environment variables");
  }

  cachedClientEnv = result.data;
  return cachedClientEnv;
}
