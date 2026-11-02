import { getServerEnv } from "@legal-mind/env";

export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    const env = getServerEnv();
    if (env.OPENROUTER_API_KEY) {
      this.apiKey = env.OPENROUTER_API_KEY;
      this.apiUrl = "https://openrouter.ai/api/v1/embeddings";
      this.model = "openai/text-embedding-3-small";
    } else {
      this.apiKey = env.OPENAI_API_KEY || "";
      this.apiUrl = "https://api.openai.com/v1/embeddings";
      this.model = "text-embedding-3-small";
    }
  }

  /**
   * Generates a 1536-dimensional embedding vector for a given text
   */
  async generateEmbedding(
    text: string,
    options: { requireProvider?: boolean } = {}
  ): Promise<number[]> {
    const cleanText = text.replace(/\n+/g, " ").trim();

    if (options.requireProvider && !this.apiKey) {
      throw new Error("A real embedding API key is required for RAG ingestion.");
    }

    if (this.apiKey) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            input: cleanText,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json?.data?.[0]?.embedding) {
            const vector = json.data[0].embedding;
            if (Array.isArray(vector) && vector.length === 1536) return vector;
            if (options.requireProvider) {
              throw new Error(`Embedding provider returned an invalid vector dimension: ${vector?.length ?? "unknown"}`);
            }
          }
        } else {
          if (options.requireProvider) {
            throw new Error(`Embedding API returned status ${response.status}.`);
          }
          console.warn(`Embedding API returned status ${response.status}. Using fallback embedding.`);
        }
      } catch (err) {
        if (options.requireProvider) throw err;
        console.warn("Embedding API network error. Using fallback embedding:", err);
      }
    }

    if (options.requireProvider) {
      throw new Error("Embedding provider did not return an embedding vector.");
    }

    // High-quality deterministic fallback vector generator for offline testing
    return this.generateDeterministicVector(cleanText, 1536);
  }

  /**
   * Generates embeddings in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.generateEmbedding(text);
      results.push(emb);
    }
    return results;
  }

  private generateDeterministicVector(text: string, dimensions = 1536): number[] {
    const vec = new Float64Array(dimensions);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
      const idx = Math.abs(h % dimensions);
      vec[idx] += 1.0;
    }

    // Normalize to unit length
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm) || 1;
    return Array.from(vec).map((v) => Number((v / norm).toFixed(6)));
  }
}

export const embeddingService = new EmbeddingService();
