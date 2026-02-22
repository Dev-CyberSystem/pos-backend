import mongoose from "mongoose";
import { PaymentTypes, SaleStatus } from "./enums.js";

// payments múltiples
const SalePaymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PaymentTypes, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const SaleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    nameSnapshot: { type: String, required: true },
    // UNIT => qty unidades, WEIGHT => qty gramos
    qty: { type: Number, required: true, min: 1 },

    // ✅ NUEVO: para auditar cómo se vendió
    uomSnapshot: { type: String, enum: ["UNIT", "WEIGHT"], required: true },

    // UNIT => precio por unidad
    // WEIGHT => precio por 100g
    unitPriceSnapshot: { type: Number, required: true, min: 0 },

    // costo snapshot (para reporting)
    unitCostSnapshot: { type: Number, required: true, min: 0 },

    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const SaleSchema = new mongoose.Schema(
  {
    dateTime: { type: Date, default: Date.now, index: true },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: { type: [SaleItemSchema], validate: (v) => v.length > 0 },

    // ✅ payments múltiples
    payments: { type: [SalePaymentSchema], validate: (v) => v.length > 0 },

    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: SaleStatus,
      default: "COMPLETED",
      index: true,
    },

    // impresión
    ticketPrinted: { type: Boolean, default: false },
    ticketPrintError: { type: String, trim: true },
    ticketPrintCount: { type: Number, default: 0 },
    ticketLastPrintAt: { type: Date },
    ticketPrintHistory: [
      {
        at: { type: Date, default: Date.now },
        action: {
          type: String,
          enum: [
            "PRINT",
            "REPRINT",
            "PRINT_JOB",
            "REPRINT_JOB",
            "RESULT_OK",
            "RESULT_FAIL",
          ],
          required: true,
        },
        note: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true },
);

SaleSchema.index({ shiftId: 1, dateTime: -1 });

export default mongoose.model("Sale", SaleSchema);
