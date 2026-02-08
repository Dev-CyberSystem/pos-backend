import mongoose from "mongoose";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { AppError } from "../utils/errors.js";

function applyStockDelta(current, type, qty) {
  if (type === "IN") return current + qty;
  if (type === "OUT") return current - qty;
  if (type === "ADJUST") return qty; // ADJUST = set absoluto
  throw new AppError("Tipo de movimiento inválido", 400, "INVALID_MOVEMENT_TYPE");
}

export async function createMovement(payload, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(payload.productId).session(session);
    if (!product) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");

    const nextStock = applyStockDelta(product.stockCurrent, payload.type, payload.qty);

    // regla MVP: no stock negativo
    if (nextStock < 0) {
      throw new AppError("Stock insuficiente para este egreso", 409, "INSUFFICIENT_STOCK");
    }

    // Creamos movimiento
    const movement = await StockMovement.create(
      [{
        productId: product._id,
        type: payload.type,
        reason: payload.reason,
        qty: payload.qty,
        unitCostSnapshot: product.costCurrent,
        userId,
        note: payload.note,
      }],
      { session }
    );

    // Actualizamos producto
    product.stockCurrent = nextStock;
    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    return movement[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function listMovements({ productId, page = "1", limit = "20" }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const filter = {};
  if (productId) filter.productId = productId;

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate("productId", "name sku")
      .lean(),
    StockMovement.countDocuments(filter),
  ]);

  return { items, total, page: p, limit: l, pages: Math.ceil(total / l) };
}
