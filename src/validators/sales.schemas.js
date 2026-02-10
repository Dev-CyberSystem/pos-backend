import { z } from "zod";
import { PaymentTypes } from "../models/enums.js";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive(), // UNIT: entero; WEIGHT: entero gramos (lo validamos en service)
  unitPrice: z.number().min(0).optional(), // override si querés
});


const salePaymentSchema = z.object({
  type: z.enum(PaymentTypes),
  amount: z.number().positive(),
});

export const createSaleSchema = z.object({
  shiftId: z.string().min(1),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(salePaymentSchema).min(1),
}).superRefine((data, ctx) => {
  const seen = new Set();
  for (const p of data.payments) {
    if (seen.has(p.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Medio de pago repetido: ${p.type}`,
        path: ["payments"],
      });
      return;
    }
    seen.add(p.type);
  }
});
