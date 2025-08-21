import { Protocol } from "puppeteer";
import { SigaCookieArray } from "../schemas/cookies.js";

export default function normalizeSigaCookies(raw: SigaCookieArray): Protocol.Network.CookieParam[] {
  const now = Math.floor(Date.now() / 1000);
  const ALLOW = ["siga.cps.sp.gov.br", "login.microsoftonline.com", "msauth.net", "live.com"];

  return raw
    .filter((c) => {
      const d = (c.domain || "").replace(/^\./, "");
      const okDomain = ALLOW.some((a) => d.includes(a));
      const notExpired = !c.expires || c.expires < 0 || c.expires > now;
      return okDomain && notExpired;
    })
    .map((c) => {
      const domain = (c.domain || "").replace(/^\./, "");
      const path = c.path && c.path.length ? c.path : "/";
      const sameSite =
        c.sameSite === "Strict" ? "Strict" :
        c.sameSite === "None"   ? "None"   :
        c.sameSite === "Lax"    ? "Lax"    : undefined;

      return {
        name: c.name,
        value: c.value,
        domain,
        path,
        url: `https://${domain}`, // necessário p/ secure:true
        httpOnly: !!c.httpOnly,
        secure: c.secure !== false,
        sameSite,
        expires: c.expires && c.expires > 0 ? Math.floor(c.expires) : undefined, // sessão => omite
      } satisfies Protocol.Network.CookieParam;
    });
}