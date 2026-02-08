import { z } from "zod";
import { ShiftTypes } from "../models/enums.js";

export const openShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(ShiftTypes),
  openingCash: z.number().min(0).optional(),
});

export const closeShiftSchema = z.object({
  closingCashCounted: z.number().min(0),
});
