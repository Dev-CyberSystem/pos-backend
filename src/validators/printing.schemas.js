import { z } from "zod";

export const markPrintErrorSchema = z.object({
  message: z.string().min(1).max(300),
});
