// import Product from "../models/Product.js";
// import { AppError } from "../utils/errors.js";

// export async function createProduct(payload) {
//   // sku único (si viene)
//   if (payload.sku) {
//     const exists = await Product.findOne({ sku: payload.sku });
//     if (exists) throw new AppError("SKU ya existe", 409, "SKU_EXISTS");
//   }
//   const product = await Product.create(payload);
//   return product;
// }

// export async function getProductById(id) {
//   const product = await Product.findById(id);
//   if (!product) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
//   return product;
// }

// export async function updateProduct(id, payload) {
//   if (payload.sku) {
//     const exists = await Product.findOne({ sku: payload.sku, _id: { $ne: id } });
//     if (exists) throw new AppError("SKU ya existe", 409, "SKU_EXISTS");
//   }

//   const product = await Product.findByIdAndUpdate(
//     id,
//     { $set: payload },
//     { new: true, runValidators: true }
//   );

//   if (!product) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
//   return product;
// }

// export async function toggleActive(id) {
//   const product = await Product.findById(id);
//   if (!product) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
//   product.active = !product.active;
//   await product.save();
//   return product;
// }

// export async function listProducts({ q, active, page = "1", limit = "20" }) {
//   const p = Math.max(parseInt(page, 10) || 1, 1);
//   const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

//   const filter = {};
//   if (active === "true") filter.active = true;
//   if (active === "false") filter.active = false;

//   if (q) {
//     const regex = new RegExp(q.trim(), "i");
//     filter.$or = [{ name: regex }, { sku: regex }];
//   }

//   const [items, total] = await Promise.all([
//     Product.find(filter).sort({ name: 1 }).skip((p - 1) * l).limit(l).lean(),
//     Product.countDocuments(filter),
//   ]);

//   return { items, total, page: p, limit: l, pages: Math.ceil(total / l) };
// }
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
