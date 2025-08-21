// src/routes/get-cookies-from-student-route.ts
import { FastifyPluginAsync } from "fastify";
import puppeteer from "puppeteer";

import { z } from "zod";

export const GetCookiesOfStudent: FastifyPluginAsync = async (app) => {
  app.get("/capture", 
    {
          // preHandler: [app.authenticate], // habilite se quiser JWT do seu app
          schema: {
            tags: ["auth"],
            summary: "Obtém os cookies de autenticação do aluno a partir do login no SIGA",
            response: {
              400: z.object({ error: z.string() }),
              401: z.object({ error: z.string() }),
              500: z.object({ error: z.string() }),
            },
          },
          config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
        },
    async (req, reply) => {
    const browser = await puppeteer.launch({ headless: false });

    try {
      const page = await browser.newPage();

      await page.goto("https://siga.cps.sp.gov.br/sigaaluno/applogin.aspx", {
        waitUntil: "domcontentloaded",
      });

      app.log.info("Faça login/2FA. Timeout: 120s");
      await page.waitForFunction(
        () =>
          location.href.startsWith("https://siga.cps.sp.gov.br/sigaaluno/app.aspx"),
        { timeout: 120_000 }
      );


      const cookies = await page.cookies();

      // você pode retornar os normalizados como JSON...
      return reply.send({ cookies });

    } catch (e) {
      app.log.error(e);
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    } finally {
      await browser.close().catch(() => {});
    }
  });
};

export default GetCookiesOfStudent;
