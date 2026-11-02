import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().transform(Number).default("3001"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/legal_mind_db"),
  OPENROUTER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  EMBEDDING_PROVIDER: z.string().default("openai"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),
});

export const clientEnvSchema = z.object({
  VITE_API_URL: z.string().default("http://localhost:3001"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
