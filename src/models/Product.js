// /src/models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, index: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true, index: true },

    costCurrent: { type: Number, required: true, min: 0 },
    priceCurrent: { type: Number, required: true, min: 0 },

    stockCurrent: { type: Number, required: true, min: 0 },
    stockMin: { type: Number, default: 0, min: 0 },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
