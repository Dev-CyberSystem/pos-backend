import mongoose from "mongoose";
import Shift from "../models/Shift.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { AppError } from "../utils/errors.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function ensureInt(n, code = "INVALID_QTY") {
  if (!Number.isInteger(n)) throw new AppError("Cantidad inválida", 400, code);
}

function computeSubtotal(product, qty, unitPriceOverride) {
  // UNIT => qty = unidades (int), precio = por unidad
  if (product.uom === "UNIT") {
    ensureInt(qty, "INVALID_QTY_UNIT");
    if (qty <= 0) throw new AppError(`Cantidad inválida para ${product.name}`, 400, "INVALID_QTY_UNIT");

    const unitPrice = unitPriceOverride ?? product.pricePerUnit;
    if (unitPrice == null) throw new AppError(`Falta pricePerUnit en ${product.name}`, 500, "PRICE_MISSING");

    const subtotal = round2(qty * unitPrice);
    return { unitPriceSnapshot: unitPrice, subtotal };
  }

  // WEIGHT => qty = gramos (int), precio = por 100g
  if (product.uom === "WEIGHT") {
    ensureInt(qty, "INVALID_QTY_WEIGHT");
    if (qty <= 0) throw new AppError(`Cantidad inválida para ${product.name}`, 400, "INVALID_QTY_WEIGHT");

    // opcional: forzar múltiplos (ej. 10g)
    // if (qty % 10 !== 0) throw new AppError(`Debe ser múltiplo de 10g: ${product.name}`, 400, "INVALID_QTY_WEIGHT");

    const pricePer100g = unitPriceOverride ?? product.pricePer100g;
    if (pricePer100g == null) throw new AppError(`Falta pricePer100g en ${product.name}`, 500, "PRICE_MISSING");

    const subtotal = round2((qty / 100) * pricePer100g);
    return { unitPriceSnapshot: pricePer100g, subtotal };
  }

  throw new AppError(`UOM inválida en producto ${product.name}`, 500, "INVALID_UOM");
}

export async function createSale(payload, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Turno abierto
    const shift = await Shift.findById(payload.shiftId).session(session);
    if (!shift) throw new AppError("Turno no encontrado", 404, "SHIFT_NOT_FOUND");
    if (shift.status !== "OPEN") throw new AppError("El turno está cerrado", 409, "SHIFT_CLOSED");

    // 2) Total pagado
    const totalPaid = round2(payload.payments.reduce((acc, p) => acc + p.amount, 0));
    if (totalPaid <= 0) throw new AppError("Pagos inválidos", 400, "INVALID_PAYMENTS");

    // 3) Traer productos (activos)
    const productIds = payload.items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, active: true }).session(session);
    const map = new Map(products.map(p => [p._id.toString(), p]));

    // 4) Armar items + calcular total
    const saleItems = [];
    let itemsTotal = 0;

    for (const it of payload.items) {
      const p = map.get(it.productId);
      if (!p) throw new AppError(`Producto inválido o inactivo: ${it.productId}`, 400, "INVALID_PRODUCT");

      const qty = it.qty; // UNIT => unidades; WEIGHT => gramos
      const unitCost = p.costCurrent ?? 0;

      const { unitPriceSnapshot, subtotal } = computeSubtotal(p, qty, it.unitPrice);

      itemsTotal = round2(itemsTotal + subtotal);

      saleItems.push({
        productId: p._id,
        nameSnapshot: p.name,
        uomSnapshot: p.uom,                 // ✅ NUEVO (debe existir en SaleItemSchema)
        qty,
        unitPriceSnapshot,                  // UNIT: por unidad | WEIGHT: por 100g
        unitCostSnapshot: unitCost,
        subtotal,
      });
    }

    // 5) Validación: total pagado = total venta
    if (round2(itemsTotal) !== round2(totalPaid)) {
      throw new AppError(
        `El total pagado (${totalPaid}) no coincide con el total de la venta (${itemsTotal})`,
        400,
        "TOTAL_MISMATCH"
      );
    }

    // 6) Descontar stock (concurrencia-safe)
    //    stockCurrent está en unidades o gramos según product.uom, y qty idem.
    for (const it of saleItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: it.productId, stockCurrent: { $gte: it.qty } },
        { $inc: { stockCurrent: -it.qty } },
        { new: true, session }
      );

      if (!updated) {
        const label = it.uomSnapshot === "WEIGHT" ? "Stock (gramos)" : "Stock (unidades)";
        throw new AppError(`${label} insuficiente para ${it.nameSnapshot}`, 409, "INSUFFICIENT_STOCK");
      }
    }

    // 7) Crear venta
    const [sale] = await Sale.create(
      [{
        shiftId: shift._id,
        userId,
        items: saleItems,
        payments: payload.payments,
        total: itemsTotal,
        status: "COMPLETED",
        ticketPrinted: false,
      }],
      { session }
    );

    // 8) Movimientos de stock (registramos qty y uom)
    await StockMovement.insertMany(
      saleItems.map(it => ({
        productId: it.productId,
        type: "OUT",
        reason: "SALE",
        qty: it.qty,                        // unidades o gramos
        uomSnapshot: it.uomSnapshot,        // ✅ NUEVO (agregar al schema StockMovement si querés)
        unitCostSnapshot: it.unitCostSnapshot,
        saleId: sale._id,
        userId,
        note: `Venta ${sale._id.toString()}`,
      })),
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sale;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

