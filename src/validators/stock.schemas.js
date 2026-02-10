import { z } from "zod";
import { StockMovementTypes, StockMovementReasons } from "../models/enums.js";

export const createStockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(StockMovementTypes),
  reason: z.enum(StockMovementReasons),
  qty: z.number().int().positive(), // UNIT=unidades, WEIGHT=gramos
  note: z.string().max(200).optional(),
});

export const listStockMovementsQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(StockMovementTypes).optional(),
  reason: z.enum(StockMovementReasons).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
