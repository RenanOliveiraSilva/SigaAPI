// src/core/login-session-store.ts
import type { Browser, Page, Protocol } from "puppeteer";
import { SigaCookie } from "../schemas/cookies.js";

export type FlowStatus = "starting" | "waiting_2fa" | "approved" | "done" | "error";

export type Flow = {
  id: string;
  browser: Browser;
  page: Page;
  status: FlowStatus;
  code?: string; // número mostrado na tela do 2FA
  cookies?: SigaCookie[]; // cookies obtidos após aprovação
  error?: string;
  createdAt: number;
};

export const flows = new Map<string, Flow>();
