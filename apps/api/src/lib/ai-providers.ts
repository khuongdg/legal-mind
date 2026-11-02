import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { getServerEnv } from "@legal-mind/env";

export function getAIProvider(): {
  reasoningModel: LanguageModel;
  fastModel: LanguageModel;
} {
  const env = getServerEnv();
  
  if (env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return {
      reasoningModel: openrouter("anthropic/claude-3.5-sonnet"),
      fastModel: openrouter("anthropic/claude-3.5-haiku"),
    };
  }

  if (env.OPENAI_API_KEY) {
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    return {
      reasoningModel: openai("gpt-4o"),
      fastModel: openai("gpt-4o-mini"),
    };
  }

  // Fallback to OpenAI client default
  const fallback = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "mock-key",
  });
  return {
    reasoningModel: fallback("gpt-4o-mini"),
    fastModel: fallback("gpt-4o-mini"),
  };
}
