import { Elysia, t } from "elysia";
import { LegalChatService } from "./service";

const chatService = new LegalChatService();

export const chatModule = new Elysia({ prefix: "/api/chat" })
  .post(
    "/",
    async ({ body }) => {
      const lastUserMessage = body.messages
        .filter((m) => m.role === "user")
        .pop()?.content || "";

      const result = await chatService.processLegalChat({
        message: lastUserMessage,
        messages: body.messages,
      });

      return result;
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            role: t.String(),
            content: t.String(),
          })
        ),
      }),
    }
  );
