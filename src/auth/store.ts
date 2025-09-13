// src/auth/store.ts
import { CookieJar } from 'tough-cookie';
import type { Cookie as PuppCookie } from 'puppeteer';

export type Session = {
  sid: string;
  status: 'waiting_2fa' | 'ok' | 'error';
  twofaUrl?: string;      // URL da Microsoft onde parou
  jar: CookieJar;         // jar das navegações (MS + SIGA)
  puppCookies?: PuppCookie[];
  error?: string;
  createdAt: number;
};

export const sessions = new Map<string, Session>();
