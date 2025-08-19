import { FastifyPluginAsync } from "fastify";
import puppeteer from "puppeteer";

export const GetCookiesOfStudent: FastifyPluginAsync = async (app) => {
  app.get("/capture", async (req, reply) => {
    // ✅ Só aqui dentro você abre o browser e espera login
    const browser = await puppeteer.launch({ headless: false });

    try {
      const page = await browser.newPage();
      await page.goto("https://siga.cps.sp.gov.br/sigaaluno/applogin.aspx", {
        waitUntil: "domcontentloaded",
      });

      app.log.info("Faça login/2FA. Timeout: 120s");
      await new Promise((r) => setTimeout(r, 90000));

      await page
        .goto("https://siga.cps.sp.gov.br/sigaaluno/app.aspx", {
          waitUntil: "networkidle0",
        })
        .catch(() => {});

      const cookies = await page.cookies();

      // ... filtra/normaliza/aqui ...
      return reply.send({ cookies }); // ou JWE, conforme seu fluxo
    } catch (e) {
      app.log.error(e);
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    } finally {
      await browser.close().catch(() => {});
    }
  });
};

export default GetCookiesOfStudent;
