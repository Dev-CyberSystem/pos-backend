import mongoose from "mongoose";
import { StockMovementTypes, StockMovementReasons } from "./enums.js";

const StockMovementSchema = new mongoose.Schema(
  {
    uomSnapshot: { type: String, enum: ["UNIT", "WEIGHT"] },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: StockMovementTypes, required: true },
    reason: { type: String, enum: StockMovementReasons, required: true },

    qty: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: (v) => Number.isInteger(v), message: "qty debe ser entero" },
    },

    unitCostSnapshot: { type: Number, min: 0 },

    // ✅ opcional recomendado
    stockAfterSnapshot: { type: Number, min: 0 },

    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ productId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ saleId: 1, createdAt: -1 });



export default mongoose.model("StockMovement", StockMovementSchema);
