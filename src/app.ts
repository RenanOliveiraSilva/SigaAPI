import { fastify, FastifyInstance } from "fastify";
import pino from "pino";
import { fastifyCors } from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";

// Rotas
import { GetDataOfStudent } from "./routes/get-data-of-student-route";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: pino({ level: process.env.LOG_LEVEL ?? "info" }),
    trustProxy: true, // útil se tiver ALB/CloudFront na frente
  }).withTypeProvider<ZodTypeProvider>();

  // Compilers do Zod
  app.setSerializerCompiler(serializerCompiler);
  app.setValidatorCompiler(validatorCompiler);

  // Segurança básica
  await app.register(helmet, {
    contentSecurityPolicy: false, // ajuste caso use swagger-ui
  });

  // CORS (pode ser string, array ou função allowlist)
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Rate limit (ex.: 300 req/5min por IP)
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "5 minutes",
  });

  // OpenAPI / Swagger
  await app.register(fastifySwagger, {
    openapi: {
      info: { title: "SIGA API", version: "0.1.0" },
      servers: [{ url: process.env.PUBLIC_URL ?? "http://localhost:3333" }],
      tags: [{ name: "student", description: "Dados do aluno" }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });

  // Healthcheck e root
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/", async () => ({ ok: true, name: "SIGA API" }));

  // Rotas
  await app.register(GetDataOfStudent, { prefix: "/student" });

  // 404 amigável
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ message: "Rota não encontrada", path: req.url });
  });

  // Handler global de erros
  app.setErrorHandler((err, _req, reply) => {
    app.log.error({ err }, "Unhandled error");
    const status = (err as any).statusCode ?? 500;
    reply.code(status).send({
      error: err.name,
      message: err.message,
      statusCode: status,
    });
  });

  return app;
}
