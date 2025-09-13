import puppeteer, { Page } from "puppeteer";

// helpers
export async function waitDocumentReady(p: puppeteer.Page) {
  await p.waitForFunction(() => document.readyState === "complete" || document.readyState === "interactive");
}

export async function waitVisibleEnabled(p: Page, selector: string) {
  await p.waitForSelector(selector, { visible: true, timeout: 60_000 });
  await p.waitForFunction((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    if (!el) return false;
    const s = getComputedStyle(el);
    const visible = s.visibility !== "hidden" && s.display !== "none" && el.offsetParent !== null;
    const enabled = !el.hasAttribute("disabled") && !(el as any).disabled !== true;
    return visible && enabled;
  }, {}, selector);
}

export async function typeStable(p: Page, selector: string, text: string) {
  // até 3 tentativas: foca, limpa, digita, valida
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await waitVisibleEnabled(p, selector);

      // foca com click (melhor que .focus() em páginas que re-renderizam)
      await p.click(selector, { delay: 20 });

      // confirma foco no elemento certo
      await p.waitForFunction((sel) => document.activeElement === document.querySelector(sel), {}, selector);

      // limpa e digita via teclado (não mantém ElementHandle)
      await p.keyboard.down("Control");
      await p.keyboard.press("A");
      await p.keyboard.up("Control");
      await p.keyboard.press("Backspace");
      await p.keyboard.type(text, { delay: 25 });

      // valida que ficou inteiro
      const ok = await p.$eval(selector, (el, expected) => {
        const v = (el as HTMLInputElement).value ?? "";
        return v.length === (expected as string).length;
      }, text);

      if (ok) return;

      // pequeno debounce antes de tentar de novo
      new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      if (attempt === 2) throw e;
      new Promise((r) => setTimeout(r, 200));
    }
  }

  // Fallback final: seta via JS e dispara eventos
  await p.evaluate((sel, val) => {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, selector, text);
}
