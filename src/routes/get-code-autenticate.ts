// src/routes/login-start.ts
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import puppeteer, { executablePath } from 'puppeteer';
import crypto from 'crypto';
import { CookieJar } from 'tough-cookie';
import { sessions } from '../auth/store.js';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const Ok = z.object({
  sessionId: z.string().uuid(),
  status: z.literal('waiting_2fa'),
  twofaUrl: z.string().url(),
});
const Err = z.object({ error: z.string(), detail: z.string().optional() });

export const LoginStartRoute: FastifyPluginAsync = async (app) => {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/login/start',
    {
      schema: {
        body: Body,
        response: { 200: Ok, 500: Err },
        tags: ['auth'],
        summary: 'Avança até 2FA e devolve URL proxy para concluir no WebView',
      },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const { email, password } = req.body;

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: await executablePath(), // Puppeteer resolve sozinho
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

        // 1) Abre SIGA e vai para MS login
        await page.goto('https://siga.cps.sp.gov.br/sigaaluno/applogin.aspx', { waitUntil: 'domcontentloaded' });

        // Ajuste o seletor do botão que dispara o login MS se necessário
        const startSel = '#GRID .uc_pointer.uc_p30';
        await page.waitForSelector(startSel, { timeout: 30000 });
        const [msPage] = await Promise.all([
          browser.waitForTarget(t => t.url().includes('login.microsoftonline.com'), { timeout: 60000 }).then(t => t.page()),
          page.click(startSel),
        ]);
        const p = msPage ?? page;

        // 2) Email
        await p.waitForSelector('input[type=email], #i0116, input[name=loginfmt]', { timeout: 60000 });
        await p.type('input[name=loginfmt], #i0116, input[type=email]', email, { delay: 20 });
        await Promise.all([
          p.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
          p.click('#idSIButton9'),
        ]);

        // 3) Senha
        await p.waitForSelector('input[name=passwd]', { timeout: 60000 });
        await p.type('input[name=passwd]', password, { delay: 20 });
        await Promise.all([
          p.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
          p.click('#idSIButton9'),
        ]);

        // 4) Agora deve surgir o fluxo de 2FA (tela de verificação)
        const currentUrl = p.url(); // URL exata onde parou

        // 5) Transfere cookies do Chrome headless p/ um CookieJar (proxy)
        const jar = new CookieJar();
        const all = await p.cookies(); // inclui cookies do domínio atual
        for (const c of all) {
          // monta cookie string compreendida pelo tough-cookie
          const domain = c.domain?.startsWith('.') ? c.domain.slice(1) : c.domain || new URL(currentUrl).hostname;
          const cookieStr =
            `${c.name}=${c.value}; Domain=${domain}; Path=${c.path || '/'}`
            + (c.secure ? '; Secure' : '')
            + (c.httpOnly ? '; HttpOnly' : '')
            + (c.expires && c.expires > 0 ? `; Expires=${new Date(c.expires * 1000).toUTCString()}` : '');
          jar.setCookieSync(cookieStr, new URL(currentUrl).origin);
        }

        const sid = crypto.randomUUID();
        sessions.set(sid, {
          sid,
          status: 'waiting_2fa',
          twofaUrl: currentUrl,
          jar,
          puppCookies: all,
          createdAt: Date.now(),
        });

        await browser.close().catch(() => {});
        const twofaProxyUrl = `${req.protocol}://${req.headers.host}/login/2fa/${sid}/relay?u=${encodeURIComponent(currentUrl)}`;

        return reply.send({ sessionId: sid, status: 'waiting_2fa', twofaUrl: twofaProxyUrl });
      } catch (e: any) {
        await browser.close().catch(() => {});
        req.log.error(e);
        return reply.code(500).send({ error: 'START_FAILED', detail: e?.message });
      }
    }
  );
};

export default LoginStartRoute;
