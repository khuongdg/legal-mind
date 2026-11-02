import { Elysia, t } from "elysia";
import { LegalRAGService } from "./service";

const ragService = new LegalRAGService();

export const ragModule = new Elysia({ prefix: "/api/rag" })
  .get(
    "/search",
    async ({ query }) => {
      const q = query.q || "";
      const limit = query.limit ? parseInt(query.limit) : 5;
      const citations = await ragService.search({
        query: q,
        limit,
        effectiveOnly: true,
      });

      return {
        query: q,
        totalMatches: citations.length,
        citations,
        searchMode: "HYBRID",
      };
    },
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get("/citations/:id", async ({ params, status }) => {
    const citation = await ragService.getCitationById(params.id);
    if (!citation) {
      return status(404, { message: "Không tìm thấy trích dẫn điều luật này" });
    }
    return citation;
  });
