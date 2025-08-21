import { z } from "zod";

export const CookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(["Lax", "Strict", "None"]).optional(),
  expires: z.number().optional(), // epoch seconds; -1/ausente = sessão
});

export const CookieArraySchema = z.array(CookieSchema).min(1).max(50);

export const CookieHeadersSchema = z.object({
  "x-siga-encblob": z.string().optional(),     // JWE compact (preferido)
  "x-siga-cookie-blob": z.string().optional(), // base64(JSON) opcional
});

export type SigaCookie = z.infer<typeof CookieSchema>;
export type SigaCookieArray = z.infer<typeof CookieArraySchema>;
