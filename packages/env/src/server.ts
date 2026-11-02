import { serverEnvSchema, type ServerEnv } from "./schema";

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const runtimeEnv = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;
  const result = serverEnvSchema.safeParse(runtimeEnv);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid server environment variables");
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}
