import { z } from "zod";
import { StockMovementTypes, StockMovementReasons } from "../models/enums.js";

export const createStockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(StockMovementTypes),
  reason: z.enum(StockMovementReasons),
  qty: z.number().positive(), // siempre positivo; el type define cómo impacta
  note: z.string().trim().max(200).optional(),
});

export const listStockMovementsQuerySchema = z.object({
  productId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
