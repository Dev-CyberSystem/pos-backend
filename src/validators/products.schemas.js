// import { z } from "zod";

// export const createProductSchema = z.object({
//   sku: z.string().trim().min(1).optional(),
//   name: z.string().trim().min(2),
//   costCurrent: z.number().min(0),
//   priceCurrent: z.number().min(0),
//   stockCurrent: z.number().min(0).default(0),
//   stockMin: z.number().min(0).default(0),
//   active: z.boolean().optional(),
// });

// export const updateProductSchema = z.object({
//   sku: z.string().trim().min(1).optional(),
//   name: z.string().trim().min(2).optional(),
//   costCurrent: z.number().min(0).optional(),
//   priceCurrent: z.number().min(0).optional(),
//   stockMin: z.number().min(0).optional(),
//   active: z.boolean().optional(),
// }).refine(obj => Object.keys(obj).length > 0, "Debe enviar al menos un campo a actualizar");

// export const listProductsQuerySchema = z.object({
//   q: z.string().optional(),
//   active: z.enum(["true", "false"]).optional(),
//   page: z.string().optional(),
//   limit: z.string().optional(),
// });
import { z } from "zod";

const UOM = ["UNIT", "WEIGHT"];

// CREATE (campos requeridos)
export const createProductSchema = z.object({
  sku: z.string().trim().optional(),
  name: z.string().min(1),
  uom: z.enum(UOM),

  pricePerUnit: z.number().min(0).optional(),
  pricePer100g: z.number().min(0).optional(),

  costCurrent: z.number().min(0).optional(),
  stockCurrent: z.number().int().min(0).optional(), // UNIT=unidades, WEIGHT=gramos
  stockMin: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.uom === "UNIT" && data.pricePerUnit == null) {
    ctx.addIssue({ code: "custom", message: "UNIT requiere pricePerUnit", path: ["pricePerUnit"] });
  }
  if (data.uom === "WEIGHT" && data.pricePer100g == null) {
    ctx.addIssue({ code: "custom", message: "WEIGHT requiere pricePer100g", path: ["pricePer100g"] });
  }
});

// UPDATE (todos opcionales, sin .partial())
export const updateProductSchema = z.object({
  sku: z.string().trim().optional(),
  name: z.string().min(1).optional(),
  uom: z.enum(UOM).optional(),

  pricePerUnit: z.number().min(0).optional(),
  pricePer100g: z.number().min(0).optional(),

  costCurrent: z.number().min(0).optional(),
  stockCurrent: z.number().int().min(0).optional(),
  stockMin: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // En update: solo validamos coherencia si están tocando uom o alguno de los precios.
  const touchingPrice = (data.pricePerUnit != null) || (data.pricePer100g != null);
  const touchingUom = (data.uom != null);

  if (touchingUom || touchingPrice) {
    // Si uom está presente, validamos contra ese uom.
    // Si uom NO está, no podemos exigir porque no sabemos si el producto actual es UNIT/WEIGHT.
    // (la regla completa la refuerza el pre("validate") del modelo Product, que sí conoce el documento real)
    if (data.uom === "UNIT") {
      // si cambian a UNIT y no mandan pricePerUnit, error
      if (data.pricePerUnit == null) {
        ctx.addIssue({ code: "custom", message: "Si uom=UNIT debes enviar pricePerUnit", path: ["pricePerUnit"] });
      }
    }
    if (data.uom === "WEIGHT") {
      if (data.pricePer100g == null) {
        ctx.addIssue({ code: "custom", message: "Si uom=WEIGHT debes enviar pricePer100g", path: ["pricePer100g"] });
      }
    }
  }
});

