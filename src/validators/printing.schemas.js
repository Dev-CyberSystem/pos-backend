import { z } from "zod";

export const markPrintErrorSchema = z.object({
  message: z.string().min(1).max(300),
});

export const printResultSchema = z.object({
  success: z.boolean(),
  message: z.string().max(300).optional(),
});