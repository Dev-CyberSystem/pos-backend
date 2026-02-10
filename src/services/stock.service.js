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
export async function createStockMovement(payload, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const p = await Product.findById(payload.productId).session(session);
    if (!p) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
    if (!p.active) throw new AppError("Producto inactivo", 409, "PRODUCT_INACTIVE");

    const qty = payload.qty;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError("Cantidad inválida", 400, "INVALID_QTY");
    }

    // Opcional: si es WEIGHT, podrías exigir múltiplos de 10g
    // if (p.uom === "WEIGHT" && qty % 10 !== 0) throw new AppError("Debe ser múltiplo de 10g", 400, "INVALID_QTY");

    let inc = 0;

    if (payload.type === "IN") inc = qty;
    if (payload.type === "OUT") inc = -qty;

    if (payload.type === "ADJUST") {
      // Ajuste al valor absoluto (stockCurrent = qty)
      // calculamos delta
      const delta = qty - p.stockCurrent;
      inc = delta;
    }

    // Validación de stock para OUT
    if (payload.type === "OUT" && p.stockCurrent < qty) {
      const label = p.uom === "WEIGHT" ? "Stock (gramos)" : "Stock (unidades)";
      throw new AppError(`${label} insuficiente`, 409, "INSUFFICIENT_STOCK");
    }

    // actualizar stock
    if (payload.type === "ADJUST") {
      p.stockCurrent = qty;
      await p.save({ session });
    } else {
      await Product.updateOne({ _id: p._id }, { $inc: { stockCurrent: inc } }, { session });
    }

    // registrar movimiento
    const [mov] = await StockMovement.create(
      [{
        productId: p._id,
        type: payload.type,
        reason: payload.reason,
        qty,
        // opcional para auditoría:
        uomSnapshot: p.uom,
        unitCostSnapshot: p.costCurrent ?? 0,
        userId,
        note: payload.note || "",
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return mov;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function listStockMovements({ productId, limit = 50 } = {}) {
  const filter = {};
  if (productId) filter.productId = productId;
  return StockMovement.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 50, 200));
}