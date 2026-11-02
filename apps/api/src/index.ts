import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { ragModule } from "./modules/rag";
import { contractModule } from "./modules/contract";
import { draftingModule } from "./modules/drafting";
import { chatModule } from "./modules/chat";
import { getServerEnv } from "@legal-mind/env";

const env = getServerEnv();

export const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "Legal-Mind API",
          version: "1.0.0",
          description: "API Documentation for Legal-Mind (AI Legal Assistant System)",
        },
      },
      path: "/swagger",
    })
  )
  .get("/", () => ({
    name: "Legal-Mind API Gateway",
    version: "1.0.0",
    status: "healthy",
    swaggerDocs: "/swagger",
  }))
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(ragModule)
  .use(contractModule)
  .use(draftingModule)
  .use(chatModule);

app.listen(env.PORT, () => {
  console.log(`⚖️ Legal-Mind Backend API running at http://localhost:${env.PORT}`);
  console.log(`📖 Swagger API Docs available at http://localhost:${env.PORT}/swagger`);
});
