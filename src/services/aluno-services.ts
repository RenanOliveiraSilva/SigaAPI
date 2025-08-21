import puppeteer from "puppeteer";
import { CookieArraySchema } from "../schemas/cookies.js";
import normalizeSigaCookies from "../utils/normalize.js";


export async function buscarNomeUsuario(cookiesInput: any): Promise<string | null> {
  // valida o array recebido
  const raw = CookieArraySchema.parse(cookiesInput);
  const cookies = normalizeSigaCookies(raw);
  if (!cookies.length) return null;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1366, height: 768 },
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...cookiesInput);

    // “esquenta” sessão em /sigaaluno por causa do path de alguns cookies
    await page.goto('https://siga.cps.sp.gov.br/sigaaluno/app.aspx', {
          waitUntil: 'networkidle2',
    });

    await page.waitForSelector('#TOPBAR', { timeout: 15000 });

    const nomeUsuario = await page.evaluate(() => {
      const topbar = document.querySelector('#TOPBAR');
      if (!topbar) return null;
      const span = topbar.querySelector('.uc_appuser-name');
      return span ? (span as HTMLElement).innerText.trim() : null;
    });

    return nomeUsuario;
  } finally {
    await browser.close().catch(() => {});
  }
}