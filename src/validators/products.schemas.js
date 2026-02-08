import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2),
  costCurrent: z.number().min(0),
  priceCurrent: z.number().min(0),
  stockCurrent: z.number().min(0).default(0),
  stockMin: z.number().min(0).default(0),
  active: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  costCurrent: z.number().min(0).optional(),
  priceCurrent: z.number().min(0).optional(),
  stockMin: z.number().min(0).optional(),
  active: z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, "Debe enviar al menos un campo a actualizar");

export const listProductsQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
