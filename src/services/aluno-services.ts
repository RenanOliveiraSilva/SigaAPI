import puppeteer, { executablePath } from "puppeteer";
import { ResponseData } from "../types/student.js";

export async function getStudentData(
  cookiesInput: any
): Promise<ResponseData | null> {
  if (!cookiesInput.length) return null;

  const browser = await puppeteer.launch({
    headless: true, // ou "new"
    executablePath: await executablePath(), // Puppeteer resolve sozinho
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
        const el = document.querySelector("#GRID .uc_appinfo-card");
        return !!(el && el.textContent && el.textContent.trim().length > 0);
      },
      { timeout: 30_000 }
    );

    // 3) Extrai os dados
    const dados = await frame.evaluate(() => {
      const headers =
        Array.from(document.querySelectorAll("#GRID .uc_appinfo-header")).map(
          (el) => el.textContent?.trim()
        ) || null;

      const content =
        Array.from(document.querySelectorAll("#GRID .uc_appinfo-content")).map(
          (el) => el.textContent?.trim()
        ) || null;

      // Extrair dados a partir do conteúdo
      const contentText = content[0] || "";

      const extractedData = {
        name: headers[0] || "",
        courseStatus:
          contentText.split("Status:")[1]?.split("RA:")[0]?.trim() || "",
        ra: contentText.split("RA:")[1]?.split("Unidade:")[0]?.trim() || "",
        college:
          contentText.split("Unidade:")[1]?.split("Curso:")[0]?.trim() || "",
        curse: contentText.split("Curso:")[1]?.split("Turno:")[0]?.trim() || "",
        turne: contentText.split("Turno:")[1]?.split("PP:")[0]?.trim() || "",
        semester:
          parseInt(
            contentText.split("Semestre:")[1]?.split("Máximo:")[0]?.trim()
          ) || 0,
      };

      return extractedData ?? null;
    });

    return dados as ResponseData;
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
