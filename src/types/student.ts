import { z } from "zod";

export const responseDataSchema = z
  .object({
    name: z.string().min(1, "nome obrigatório"),
    courseStatus: z.string().min(1),
    ra: z
      .string()
      .min(1, "RA obrigatório")
      .regex(/^\d+$/, "RA deve conter apenas dígitos"), // ajuste se RA puder ter letras
    college: z.string().min(1),
    curse: z.string().min(1),
    turne: z.string().min(1),
    semester: z.number().nonnegative(),
  })
  .strict();

export type ResponseData = z.infer<typeof responseDataSchema>;
