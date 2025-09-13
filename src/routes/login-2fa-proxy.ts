// src/routes/login-2fa-proxy.ts
import { FastifyPluginAsync } from 'fastify';
import { CookieJar } from 'tough-cookie';
import got from 'got';
import { sessions } from '../auth/store.js';

function absolutize(base: string, maybe: string) {
  try { return new URL(maybe).toString(); } catch {
    return new URL(maybe, base).toString();
  }
}

// reescreve URLs do HTML para passarem pelo relay novamente
function rewriteHtml(html: string, sid: string, baseUrl: string, hostBase: string) {
  const wrap = (u: string) => `${hostBase}/login/2fa/${sid}/relay?u=${encodeURIComponent(u)}`;
  // href= / action= / src=
  return html
    // tags com aspas
    .replace(/(href|src|action)=["']([^"']+)["']/gi, (_m, attr, url) => {
      const abs = absolutize(baseUrl, url);
      return `${attr}="${wrap(abs)}"`;
    })
    // meta refresh
    .replace(/http-equiv=["']refresh["'][^>]*content=["'][^;]+;\s*url=([^"']+)["']/gi, (_m, url) => {
      const abs = absolutize(baseUrl, url);
      return `http-equiv="refresh" content="0; url=${wrap(abs)}"`;
    });
}

export const Login2faProxyRoute: FastifyPluginAsync = async (app) => {
  app.all('/login/2fa/:sid/relay', async (req, reply) => {
    const { sid } = req.params as { sid: string };
    const sess = sessions.get(sid);
    if (!sess) return reply.code(440).send('SESSION_EXPIRED');

    const jar: CookieJar = sess.jar;
    const target = (req.query as any)?.u as string | undefined;
    const upstream = target ?? sess.twofaUrl!;
    const hostBase = `${req.protocol}://${req.headers.host}`;

    try {
      // encaminha método/headers/body
      const method = (req.method || 'GET') as any;
      const body = ['POST', 'PUT', 'PATCH'].includes(method) ? req.raw : undefined;

      // faz a requisição mantendo cookies com jar
      const res = await got(upstream, {
        method,
        body,
        throwHttpErrors: false,
        followRedirect: false, // nós lidamos manualmente
        cookieJar: jar,
        headers: {
          'user-agent': req.headers['user-agent'] as string ?? 'Mozilla/5.0',
          'content-type': (req.headers['content-type'] as string) ?? undefined,
          'accept-language': 'pt-BR,pt;q=0.9',
        },
        // importante para POST pass-through:
        isStream: false,
      });

      // redirecionamento: reescreve Location para passar pelo relay
      const loc = res.headers['location'] as string | undefined;
      if (loc) {
        const abs = absolutize(upstream, loc);

        // Detecta sucesso quando chegar no SIGA logado
        if (abs.startsWith('https://siga.cps.sp.gov.br/sigaaluno/app.aspx')) {
          // sessão concluída — emita JWT do seu app aqui ou marque status
          sess.status = 'ok';

          const successHtml = `
            <!doctype html><meta charset="utf-8">
            <title>Login concluído</title>
            <script>
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, sid: ${JSON.stringify(sid)} }));
              }
            </script>
            <p>Autenticação concluída. Você já pode fechar esta tela.</p>
          `;
          return reply.type('text/html').send(successHtml);
        }

        // Continua o fluxo: redireciona via nosso relay
        const relay = `${hostBase}/login/2fa/${sid}/relay?u=${encodeURIComponent(abs)}`;
        return reply.code(302).redirect(relay);
      }

      // resposta normal: se for HTML, reescreve links/forms
      const ct = (res.headers['content-type'] || '') as string;
      if (ct.includes('text/html')) {
        const bodyStr = res.body?.toString?.() ?? String(res.body ?? '');
        const rewritten = rewriteHtml(bodyStr, sid, upstream, hostBase);
        return reply
          .headers({ 'content-type': 'text/html; charset=utf-8' })
          .send(rewritten);
      }

      // assets/json: devolve direto
      reply.headers(res.headers as any).status(res.statusCode);
      return reply.send(res.rawBody ?? res.body);
    } catch (e: any) {
      app.log.error(e);
      sess.status = 'error';
      sess.error = e?.message;
      return reply.code(500).send('Proxy error');
    }
  });
};

export default Login2faProxyRoute;
