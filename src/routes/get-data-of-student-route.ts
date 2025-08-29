import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CookieArraySchema } from "../schemas/cookies.js";
import { buscarNomeUsuario } from "../services/aluno-services.js";
import { responseDataSchema } from "../types/student.js";

export const GetDataOfStudent: FastifyPluginAsync = async (app) => {
  app.post(
    "/usuario",
    {
      schema: {
        tags: ["student"],
        summary: "Retorna o nome do aluno usando cookies enviados no body",
        body: z.object({ cookies: CookieArraySchema }),
        response: {
          200: z.object({ data: responseDataSchema }),
          401: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { cookies } = request.body as { cookies: unknown };
        const nome = await buscarNomeUsuario(cookies);

        if (!nome)
          return reply
            .code(401)
            .send({ error: "Sessão inválida ou expirada." });
        reply.header("cache-control", "no-store");

        return { data: { nome } };
      } catch (err: any) {
        if (err?.name === "ZodError") {
          return reply.code(400).send({ error: "Body inválido" });
        }
        app.log.error({ err }, "POST /student/usuario failed");
        return reply.code(500).send({ error: "Erro interno" });
      }
    }
  );
};

export default GetDataOfStudent;
