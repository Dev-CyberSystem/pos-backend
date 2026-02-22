import mongoose from "mongoose";

const UOM = ["UNIT", "WEIGHT"];

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },

    // Unidad de medida
    // UNIT => stock en unidades
    // WEIGHT => stock en gramos
    uom: { type: String, enum: UOM, required: true, default: "UNIT", index: true },

    // Precios (según uom)
    // UNIT => pricePerUnit obligatorio
    pricePerUnit: { type: Number, min: 0 },
    // WEIGHT => pricePer100g obligatorio
    pricePer100g: { type: Number, min: 0 },

    // costo unitario (para WEIGHT es costo por 100g? para MVP lo dejamos como costo "referencia")
    // lo usamos como snapshot en la venta / movimientos (mismo campo para ambos).
    costCurrent: { type: Number, min: 0, default: 0 },

    // Stock: UNIT => unidades; WEIGHT => gramos
    stockCurrent: { type: Number, min: 0, default: 0 },
    stockMin: { type: Number, min: 0, default: 0 },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Validaciones cruzadas
ProductSchema.pre("validate", function (next) {
  if (this.uom === "UNIT") {
    if (this.pricePerUnit == null) return next(new Error("UNIT requiere pricePerUnit"));
    // opcional: no permitir pricePer100g en UNIT
    // this.pricePer100g = undefined;
  }

  if (this.uom === "WEIGHT") {
    if (this.pricePer100g == null) return next(new Error("WEIGHT requiere pricePer100g"));
    // opcional: no permitir pricePerUnit en WEIGHT
    // this.pricePerUnit = undefined;
  }

  next();
});

ProductSchema.index({ name: 1 });

export default mongoose.model("Product", ProductSchema);
export { UOM };
