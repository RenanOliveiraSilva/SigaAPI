import { fastify, FastifyInstance } from "fastify";
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
import GetCookiesOfStudent from "./routes/get-cookies-from-student-route.js";
import { GetDataOfStudent } from "./routes/get-data-of-student-route.js";
import jwtPlugin from "./plugins/jwt.js";
import LoginStartRoute from "./routes/get-code-autenticate.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Compilers do Zod
  app.setSerializerCompiler(serializerCompiler);
  app.setValidatorCompiler(validatorCompiler);

  // Segurança básica
  await app.register(helmet, {
    contentSecurityPolicy: false, // ajuste caso use swagger-ui
  });

  //Configuração do Cors
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
      servers: [{ url: "/" }], // 👈 usa o mesmo origin do /docs
      tags: [
        { name: "student", description: "Dados do aluno" },
        { name: "auth", description: "Autenticação" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      // permite que o token persistente seja salvo na UI entre reloads
      persistAuthorization: true,
    },
  });

  // Healthcheck e root
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/", async () => ({ ok: true, name: "SIGA API" }));

  // registra plugin de JWT (vai lançar se JWT_SECRET não estiver definido)
  await app.register(jwtPlugin);

  // Rotas
  await app.register(GetCookiesOfStudent, { prefix: "/login" });
  await app.register(GetDataOfStudent, { prefix: "/student" });
  await app.register(LoginStartRoute, { prefix: "/student" });

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
