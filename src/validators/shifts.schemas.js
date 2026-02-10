import { z } from "zod";
import { ShiftTypes, CashMovementTypes, CashMovementReasons  } from "../models/enums.js";

export const openShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(ShiftTypes),
  openingCash: z.number().min(0).optional(),
});

export const closeShiftSchema = z.object({
  closingCashCounted: z.number().min(0),
});

export const createCashMovementSchema = z.object({
  type: z.enum(CashMovementTypes),
  reason: z.enum(CashMovementReasons),
  amount: z.number().positive(),
  note: z.string().max(200).optional(),
});

export const ledgerQuerySchema = z.object({
  // opcional, por si querés limitar resultados
  salesLimit: z.string().optional(),
  cashLimit: z.string().optional(),
});