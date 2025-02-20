import puppeteer, { Page, Browser } from "puppeteer";

export async function studentLogin(username: string, password: string) {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({ headless: true });
    const page: Page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);

    // Acessa a página de login
    await page.goto("https://siga.cps.sp.gov.br/aluno/login.aspx", {
      waitUntil: "networkidle2",
    });

    // Preenche os campos e faz login
    await page.type("#vSIS_USUARIOID", username);
    await page.type("#vSIS_USUARIOSENHA", password);
    await page.click('[name="BTCONFIRMA"]');

    // Espera pela navegação OU pela atualização do erro (o que acontecer primeiro)
    await Promise.race([
      page.waitForNavigation({ waitUntil: "networkidle2", }).catch(() => null),
      page.waitForFunction(() => {
        const span = document.querySelector("#span_vSAIDA");
        return span && span.textContent && span.textContent.trim().length > 0;
      }, { timeout: 5000 }).catch(() => null)
    ]);

    // Verifica se o login foi bem-sucedido
    if (page.url().includes("home.aspx")) {
      console.log("✅ Login realizado com sucesso!");
      return { success: true, browser, page };
    }

    // Captura o erro APÓS garantir que ele tenha sido atualizado
    const errorMessage = await page.evaluate(() => {
      const spanElement = document.querySelector("#span_vSAIDA");
      return spanElement?.textContent?.trim() || "";
    });

    console.log("🔍 Conteúdo atualizado de #span_vSAIDA:", `"${errorMessage}"`);

    // Se houver um texto no span, significa que o login falhou
    if (errorMessage.length > 0) {
      console.log("❌ Credenciais inválidas! Mensagem:", errorMessage);
      return { success: false, message: errorMessage, browser, page };
    }

    return { success: false, browser, page };

  } catch (error: any) {
    console.error("❌ Erro ao realizar login:", error.message);

    if (browser) {
      await browser.close();
    }

    return { success: false, message: error.message };
  }
}
