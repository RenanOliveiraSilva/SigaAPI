import puppeteer from "puppeteer";
import { CookieArraySchema } from "../schemas/cookies.js";
import normalizeSigaCookies from "../utils/normalize.js";

export async function buscarNomeUsuario(
  cookiesInput: any
): Promise<string | null> {
  const raw = CookieArraySchema.parse(cookiesInput);
  const cookies = normalizeSigaCookies(raw);
  if (!cookies.length) return null;

  const browser = await puppeteer.launch({
    headless: true, // ou "new"
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1366, height: 768 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    // use os cookies normalizados
    await page.setCookie(...cookiesInput);

    // aquece a sessão
    await page.goto("https://siga.cps.sp.gov.br/sigaaluno/app.aspx", {
      waitUntil: "networkidle2",
      timeout: 120_000,
    });

    // pega o frame da aplicação
    const frame = await waitForFrameBy(
      page,
      (f) => /siga/i.test(f.url()),
      60_000
    );
    if (!frame) throw new Error("Frame não encontrado");

    // 1) Dispara a ação do GeneXus para abrir 'meu curso' (preenche o GRID)
    await frame.evaluate(() => {
      // @ts-ignore
      gx.getObj("", false)
        .getUserControl("BOOTSTRAPCLICK1Container")
        .bootstrapclick("FOOTER:MEUCURSO");
    });

    // 2) Espera o título existir e ter texto
    await frame.waitForFunction(
      () => {
        const el = document.querySelector("#GRID .uc_appinfo-title");
        return !!(el && el.textContent && el.textContent.trim().length > 0);
      },
      { timeout: 30_000 }
    );

    // 3) Lê o nome do GRID
    const nomeDoGrid = await frame.evaluate(
      () =>
        document
          .querySelector("#GRID .uc_appinfo-title")
          ?.textContent?.trim() || null
    );
    if (nomeDoGrid) return nomeDoGrid;

    return nomeDoGrid ?? "Nome não encontrado";
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Espera por um frame que satisfaça o predicado `match` dentro do timeout. */
async function waitForFrameBy(
  page: puppeteer.Page,
  match: (f: puppeteer.Frame) => boolean,
  timeoutMs = 30_000,
  pollMs = 250
): Promise<puppeteer.Frame | null> {
  const start = Date.now();
  let found = page.frames().find(match);
  if (found) return found;

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    found = page.frames().find(match);
    if (found) return found;
  }
  return null;
}
