import { z } from "zod";

export const dateRangeQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  groupBy: z.enum(["day", "week", "month", "shift"]).optional(),
  limit: z.string().optional(),
});
