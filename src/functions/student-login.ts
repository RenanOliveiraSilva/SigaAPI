import puppeteer, { Page, Browser } from "puppeteer";

export async function studentLogin(username: string, password: string) {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({ headless: true });
    const page: Page = await browser.newPage();
    await page.setDefaultNavigationTimeout(100000);

    // Acessa a página de login
    await page.goto("https://siga.cps.sp.gov.br/aluno/login.aspx", {
      waitUntil: "networkidle2",
    });

    // Preenche os campos e faz login
    await page.type("#vSIS_USUARIOID", username);
    await page.type("#vSIS_USUARIOSENHA", password);

    await Promise.all([
      page.click('[name="BTCONFIRMA"]'),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);

    // Verifica se o login foi bem-sucedido
    if (!page.url().includes("home.aspx")) {
      throw new Error("Credenciais inválidas!");
    }

    console.log("✅ Login realizado com sucesso!");

    // Retorna o browser e a página autenticada para uso posterior
    return { success: true, browser, page };

  } catch (error: any) {
    console.error("❌ Erro ao realizar login:", error.message);

    // Garante que o navegador seja fechado caso o login falhe
    if (browser) {
      await browser.close();
    }

    return { success: false, message: error.message };
  }
}
