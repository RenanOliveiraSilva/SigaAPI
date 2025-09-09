// src/routes/login-start-route.ts
import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import puppeteer from "puppeteer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { flows } from "../core/login-session-storage.js";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const StartOkSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.literal("waiting_2fa"),
  code: z.string().min(1).optional(),
});

const ErrorSchema = z.object({ error: z.string() });
const ErrorWithDetailSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});

export const LoginStartRoute: FastifyPluginAsync = async (app) => {
  // habilita zod como type provider
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/login/start",
    {
      schema: {
        tags: ["auth"],
        summary:
          "Inicia o login no SIGA, avança até a tela de 2FA e retorna o código + sessionId",
        body: BodySchema,
        response: {
          200: StartOkSchema,
          400: ErrorSchema,
          500: ErrorWithDetailSchema,
        },
      },
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { email, password } = request.body; // já validado pelo Zod

      // 1) Chrome compatível com container
      const browser = await puppeteer.launch({
        headless: false,                              // em cloud use headless
        executablePath: puppeteer.executablePath(),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
        ],
      });

      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9" });

      try {
        // 2) Tela inicial do SIGA
        await page.goto("https://siga.cps.sp.gov.br/sigaaluno/applogin.aspx", {
          waitUntil: "domcontentloaded",
        });

        // 2.1) Clicar no “Ingressar no sistema”
        const clickableSelector =
          '#GRID .uc_pointer.uc_p30[onclick*="bootstrapclick(\'LOGIN\')"]';
        await page.waitForSelector(clickableSelector, {
          visible: true,
          timeout: 30_000,
        });

        const [loginPage] = await Promise.all([
          browser
            .waitForTarget(
              (t) => t.url().includes("login.microsoftonline.com"),
              { timeout: 60_000 }
            )
            .then((t) => t.page())
            .catch(() => null),
          page.click(clickableSelector, { delay: 40 }),
        ]);

        const p = loginPage ?? page;

        // // 3) EMAIL
        await p.waitForFunction(
            () => location.href.includes("login.microsoftonline.com"),
            { timeout: 60_000 }
        );

        const EMAIL_SELECTOR = '#i0116, input[name="loginfmt"]';
        await p.waitForSelector(EMAIL_SELECTOR, { visible: true, timeout: 60_000 });

        // 3) foca e digita
        await p.evaluate((sel) => (document.querySelector(sel) as HTMLInputElement)?.focus(), EMAIL_SELECTOR);
        await p.type(EMAIL_SELECTOR, email, { delay: 25 });

        // 4) clica em “Avançar” e espera a próxima tela
        await Promise.all([
            p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {}),
            p.click("#idSIButton9"),
        ]);

        // await Promise.race([
        //   p.waitForSelector('input[name="loginfmt"]', { timeout: 60_000 }),
        //   p.waitForFunction(
        //     () => location.href.includes("login.microsoftonline.com"),
        //     { timeout: 60_000 }
        //   ),
        // ]);
        // await p.type('input[name="loginfmt"]', email, { delay: 20 });
        // await p.click("#idSIButton9"); // Avançar
        // await p
        //   .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 })
        //   .catch(() => {});

        // // 4) SENHA
        // await p.waitForSelector('input[name="passwd"]', { timeout: 60_000 });
        // await p.type('input[name="passwd"]', password, { delay: 20 });
        // await p.click("#idSIButton9"); // Entrar
        // await p
        //   .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 })
        //   .catch(() => {});

        // // 5) "Manter a sessão iniciada?" (se aparecer) -> Não
        // try {
        //   await p.waitForSelector("#idBtn_Back, #idSIButton9", {
        //     timeout: 10_000,
        //   });
        //   const hasNo = await p.$("#idBtn_Back");
        //   if (hasNo) {
        //     await p.click("#idBtn_Back");
        //     await p
        //       .waitForNavigation({
        //         waitUntil: "domcontentloaded",
        //         timeout: 60_000,
        //       })
        //       .catch(() => {});
        //   }
        // } catch {}

        // // 6) Tela de 2FA — extrai o número exibido
        // await p.waitForFunction(
        //   () => /\b\d{2,3}\b/.test(document.body.innerText),
        //   { timeout: 60_000 }
        // );
        // const code =
        //   (await p.evaluate(() => {
        //     const m = document.body.innerText.match(/\b\d{2,3}\b/);
        //     return m ? m[0] : null;
        //   })) ?? undefined;

        // // 7) Registra o fluxo
        // const id = randomUUID();
        // flows.set(id, {
        //   id,
        //   browser,
        //   page: p,
        //   status: "waiting_2fa",
        //   code,
        //   createdAt: Date.now(),
        // });

        // // 8) Aguarda aprovação em background
        // (async () => {
        //   const flow = flows.get(id);
        //   if (!flow) return;
        //   try {
        //     await p.waitForFunction(
        //       () =>
        //         location.href.startsWith(
        //           "https://siga.cps.sp.gov.br/sigaaluno/app.aspx"
        //         ),
        //       { timeout: 120_000 }
        //     );
        //     const cookies = await p.cookies();
        //     flow.status = "done";
        //     flow.cookies = cookies;
        //   } catch (e: any) {
        //     const f = flows.get(id);
        //     if (f) {
        //       f.status = "error";
        //       f.error = e?.message ?? "WAIT_NAV_FAILED";
        //     }
        //   }
        // })();

        // 200 OK — schema StartOkSchema
        return reply.send({ sessionId: '1', status: "waiting_2fa", code: '' });
      } catch (e: any) {
        await browser.close().catch(() => {});
        request.log.error(e);
        // 500 — schema ErrorWithDetailSchema
        return reply
          .code(500)
          .send({ error: "START_FAILED", detail: e?.message });
      }
    }
  );
};

export default LoginStartRoute;