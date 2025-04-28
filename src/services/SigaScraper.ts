// src/services/SigaScraper.ts

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function openBrowserWithCookies(): Promise<{ browser: Browser, page: Page }> {
  const cookiesPath = path.resolve(__dirname, '..', '..', 'cookies.json');

  if (!fs.existsSync(cookiesPath)) {
    throw new Error('cookies.json não encontrado! Faça login manual primeiro.');
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setCookie(...cookies);

  return { browser, page };
}

export async function buscarNomeUsuario(): Promise<string | null> {
  const { browser, page } = await openBrowserWithCookies();

  try {
    // Navegar até a página inicial do SIGA
    await page.goto('https://siga.cps.sp.gov.br/sigaaluno/app.aspx', {
      waitUntil: 'networkidle2',
    });

    // Esperar o elemento da barra superior carregar
    await page.waitForSelector('#TOPBAR', { timeout: 15000 });

    // Capturar o nome do usuário
    const nomeUsuario = await page.evaluate(() => {
      const topbar = document.querySelector('#TOPBAR');
      if (!topbar) return null;
      const span = topbar.querySelector('.uc_appuser-name');
      return span ? (span as HTMLElement).innerText.trim() : null;
    });

    return nomeUsuario;
  } catch (error) {
    console.error('Erro ao buscar nome do usuário:', error);
    return null;
  } finally {
    await browser.close();
  }
}
