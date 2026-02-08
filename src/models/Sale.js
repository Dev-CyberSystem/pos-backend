// /src/models/Sale.js
import mongoose from "mongoose";
import { PaymentTypes, SaleStatus } from "./enums.js";

const SaleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },

    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    unitCostSnapshot: { type: Number, required: true, min: 0 },

    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    dateTime: { type: Date, default: Date.now, index: true },

    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: { type: [SaleItemSchema], validate: v => v.length > 0 },

    paymentType: { type: String, enum: PaymentTypes, required: true, index: true },
    total: { type: Number, required: true, min: 0 },

    status: { type: String, enum: SaleStatus, default: "COMPLETED", index: true },

    // impresión
    ticketPrinted: { type: Boolean, default: false },
    ticketPrintError: { type: String, trim: true },
  },
  { timestamps: true }
);

SaleSchema.index({ shiftId: 1, dateTime: -1 });

export default mongoose.model("Sale", SaleSchema);
