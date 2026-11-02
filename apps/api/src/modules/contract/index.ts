import { Elysia, t } from "elysia";
import { ContractReviewService } from "./service";
import { ContractTypeEnum } from "@legal-mind/legal-schemas";

const contractService = new ContractReviewService();

export const contractModule = new Elysia({ prefix: "/api/contract" })
  .post(
    "/analyze",
    async ({ body }) => {
      const result = await contractService.analyzeContract(
        body.rawContent,
        body.contractType as any
      );
      return result;
    },
    {
      body: t.Object({
        rawContent: t.String(),
        contractType: t.Optional(t.String()),
      }),
    }
  );
