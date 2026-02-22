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

    if (nextStock < 0) {
      throw new AppError("Stock insuficiente para este egreso", 409, "INSUFFICIENT_STOCK");
    }

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

/**
 * ✅ Nueva versión recomendada (con snapshots + stockAfterSnapshot)
 */
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

    const current = Number(p.stockCurrent || 0);
    let nextStock = current;

    if (payload.type === "IN") nextStock = current + qty;
    if (payload.type === "OUT") nextStock = current - qty;
    if (payload.type === "ADJUST") nextStock = qty;

    if (nextStock < 0) {
      const label = p.uom === "WEIGHT" ? "Stock (gramos)" : "Stock (unidades)";
      throw new AppError(`${label} insuficiente`, 409, "INSUFFICIENT_STOCK");
    }

    // actualizar stock
    p.stockCurrent = nextStock;
    await p.save({ session });

    // registrar movimiento con snapshots
    const [mov] = await StockMovement.create(
      [{
        productId: p._id,
        type: payload.type,
        reason: payload.reason,
        qty,
        uomSnapshot: p.uom,
        unitCostSnapshot: p.costCurrent ?? 0,
        stockAfterSnapshot: nextStock, // ✅ clave
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

export async function listStockMovements({ productId, type, reason, limit, page } = {}) {
  const q = {};
  if (productId) q.productId = productId;
  if (type) q.type = type;
  if (reason) q.reason = reason;

  const lim = Math.min(Number(limit || 50), 200);
  const pg = Math.max(Number(page || 1), 1);
  const skip = (pg - 1) * lim;

  const items = await StockMovement.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .populate("productId", "name sku uom")
    .lean();

  return items;
}

export async function stockSummary({ q, status, uom, limit = 200 } = {}) {
  const matchProduct = { active: true };

  // ✅ no filtrar si viene ALL o vacío
  if (uom && uom !== "ALL") matchProduct.uom = uom;

  if (q && String(q).trim()) {
    const s = String(q).trim();
    matchProduct.$or = [
      { name: { $regex: s, $options: "i" } },
      { sku: { $regex: s, $options: "i" } },
    ];
  }

  const lim = Math.min(Number(limit) || 200, 500);

  // ✅ OJO: acá no retornamos todavía. Necesitamos rows para calcular status.
  const rows = await Product.aggregate([
    { $match: matchProduct },
    {
      $lookup: {
        from: "stockmovements",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$productId", "$$pid"] },
                  { $eq: ["$type", "IN"] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { createdAt: 1, qty: 1, reason: 1 } },
        ],
        as: "lastIn",
      },
    },
    { $addFields: { lastIn: { $first: "$lastIn" } } },
    {
      $project: {
        name: 1,
        sku: 1,
        uom: 1,
        stockCurrent: 1,
        stockMin: 1,
        lastInboundAt: "$lastIn.createdAt",
        lastInboundQty: "$lastIn.qty",
        lastInboundReason: "$lastIn.reason",
      },
    },
    { $limit: lim },
  ]);

  const normalized = rows.map((p) => {
    const cur = Number(p.stockCurrent || 0);
    const min = Number(p.stockMin ?? 0);
    let statusKey = "OK";
    if (cur <= 0) statusKey = "OUT";
    else if (min > 0 && cur <= min) statusKey = "LOW";
    return { ...p, status: statusKey };
  });

  if (status && status !== "ALL") {
    return normalized.filter((x) => x.status === status);
  }
  return normalized;
}
