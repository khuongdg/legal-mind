import { Elysia, t } from "elysia";
import { LegalDraftingService } from "./service";

const draftingService = new LegalDraftingService();

export const draftingModule = new Elysia({ prefix: "/api/drafting" })
  .get("/templates", async () => {
    return draftingService.getTemplates();
  })
  .post(
    "/generate",
    async ({ body }) => {
      return draftingService.generateDocument({
        templateId: body.templateId,
        formData: body.formData,
        outputFormat: (body.outputFormat as any) || "MARKDOWN",
      });
    },
    {
      body: t.Object({
        templateId: t.String(),
        formData: t.Record(t.String(), t.Any()),
        outputFormat: t.Optional(t.String()),
      }),
    }
  );
