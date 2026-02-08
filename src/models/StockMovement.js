// /src/models/StockMovement.js
import mongoose from "mongoose";
import { StockMovementTypes, StockMovementReasons } from "./enums.js";

const StockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: StockMovementTypes, required: true },
    reason: { type: String, enum: StockMovementReasons, required: true },

    qty: { type: Number, required: true }, // positivo; el type define el signo efectivo
    unitCostSnapshot: { type: Number, min: 0 },

    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model("StockMovement", StockMovementSchema);
