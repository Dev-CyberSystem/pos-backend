import Product from "../models/Product.js";
import { AppError } from "../utils/errors.js";

export async function listProducts({ q, active } = {}) {
  const filter = {};
  if (typeof active === "boolean") filter.active = active;

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
    ];
  }

  return Product.find(filter).sort({ name: 1 });
}

export async function getProduct(id) {
  const p = await Product.findById(id);
  if (!p) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  return p;
}

export async function createProduct(data) {
  const p = await Product.create(data);
  return p;
}

export async function updateProduct(id, data) {
  const p = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!p) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  return p;
}

export async function deactivateProduct(id) {
  const p = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!p) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  return p;
}
