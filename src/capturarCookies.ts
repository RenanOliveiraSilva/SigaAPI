// src/capturarCookies.ts

import puppeteer from "puppeteer";
import fs from "fs";

async function capturarCookies() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 1. Acessar a tela de login
  await page.goto("https://siga.cps.sp.gov.br/sigaaluno/applogin.aspx");

  console.log("Por favor, faça o login manualmente e passe o 2FA...");

  // 2. Esperar o usuário logar manualmente
  await new Promise((resolve) => setTimeout(resolve, 90000)); // Espera 60 segundos

  // 3. Depois de logado, já vai ter sido redirecionado automaticamente para app.aspx
  // Agora capturamos os cookies corretos
  const cookies = await page.cookies();

  // fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  // console.log('✅ Cookies capturados e salvos no arquivo cookies.json!');

  await browser.close();
  return cookies;
}
