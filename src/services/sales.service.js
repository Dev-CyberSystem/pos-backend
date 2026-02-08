// import mongoose from "mongoose";
// import Shift from "../models/Shift.js";
// import Sale from "../models/Sale.js";
// import Product from "../models/Product.js";
// import StockMovement from "../models/StockMovement.js";
// import { AppError } from "../utils/errors.js";

// /**
//  * Crea una venta de forma atómica:
//  * - valida turno abierto
//  * - valida productos + stock
//  * - crea Sale (snapshots)
//  * - descuenta stock
//  * - crea StockMovement OUT reason SALE por ítem
//  */
// export async function createSale(payload, userId) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // 1) Turno abierto
//     const shift = await Shift.findById(payload.shiftId).session(session);
//     if (!shift) throw new AppError("Turno no encontrado", 404, "SHIFT_NOT_FOUND");
//     if (shift.status !== "OPEN") throw new AppError("El turno está cerrado", 409, "SHIFT_CLOSED");

//     // 2) Traemos productos en lote
//     const productIds = payload.items.map(i => i.productId);
//     const products = await Product.find({ _id: { $in: productIds }, active: true })
//       .session(session);

//     const map = new Map(products.map(p => [p._id.toString(), p]));

//     // 3) Armamos items con snapshots y validamos stock
//     const saleItems = [];
//     let total = 0;

//     for (const it of payload.items) {
//       const p = map.get(it.productId);
//       if (!p) throw new AppError(`Producto inválido o inactivo: ${it.productId}`, 400, "INVALID_PRODUCT");

//       const qty = it.qty;

//       // precio: si viene override lo usamos; si no, el actual
//       const unitPrice = (it.unitPrice ?? p.priceCurrent);
//       const unitCost = p.costCurrent;

//       if (p.stockCurrent - qty < 0) {
//         throw new AppError(`Stock insuficiente para ${p.name}`, 409, "INSUFFICIENT_STOCK");
//       }

//       const subtotal = qty * unitPrice;
//       total += subtotal;

//       saleItems.push({
//         productId: p._id,
//         nameSnapshot: p.name,
//         qty,
//         unitPriceSnapshot: unitPrice,
//         unitCostSnapshot: unitCost,
//         subtotal,
//       });
//     }

//     // 4) Creamos Sale
//     const [sale] = await Sale.create(
//       [{
//         shiftId: shift._id,
//         userId,
//         items: saleItems,
//         paymentType: payload.paymentType,
//         total,
//         status: "COMPLETED",
//         ticketPrinted: false,
//       }],
//       { session }
//     );

//     // 5) Descontamos stock + movimientos
//     //    (se hace por ítem; es OK para MVP. Si querés, optimizamos con bulkWrite luego)
//     const movementsToCreate = [];
//     for (const it of saleItems) {
//       const p = map.get(it.productId.toString());

//       p.stockCurrent = p.stockCurrent - it.qty;
//       await p.save({ session });

//       movementsToCreate.push({
//         productId: p._id,
//         type: "OUT",
//         reason: "SALE",
//         qty: it.qty,
//         unitCostSnapshot: it.unitCostSnapshot,
//         saleId: sale._id,
//         userId,
//         note: `Venta ${sale._id.toString()}`,
//       });
//     }

//     await StockMovement.insertMany(movementsToCreate, { session });

//     await session.commitTransaction();
//     session.endSession();

//     return sale;
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     throw err;
//   }
// }

import mongoose from "mongoose";
import Shift from "../models/Shift.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { AppError } from "../utils/errors.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

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

    // 4) Armar items con snapshots y calcular total de items
    const saleItems = [];
    let itemsTotal = 0;

    for (const it of payload.items) {
      const p = map.get(it.productId);
      if (!p) throw new AppError(`Producto inválido o inactivo: ${it.productId}`, 400, "INVALID_PRODUCT");

      const qty = it.qty;
      const unitPrice = (it.unitPrice ?? p.priceCurrent);
      const unitCost = p.costCurrent;

      const subtotal = round2(qty * unitPrice);
      itemsTotal = round2(itemsTotal + subtotal);

      saleItems.push({
        productId: p._id,
        nameSnapshot: p.name,
        qty,
        unitPriceSnapshot: unitPrice,
        unitCostSnapshot: unitCost,
        subtotal,
      });
    }

    // 5) Validación: total pagado debe coincidir con total items
    if (round2(itemsTotal) !== round2(totalPaid)) {
      throw new AppError(
        `El total pagado (${totalPaid}) no coincide con el total de la venta (${itemsTotal})`,
        400,
        "TOTAL_MISMATCH"
      );
    }

    // 6) Descontar stock con condición (concurrencia-safe)
    for (const it of saleItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: it.productId, stockCurrent: { $gte: it.qty } },
        { $inc: { stockCurrent: -it.qty } },
        { new: true, session }
      );

      if (!updated) {
        throw new AppError(`Stock insuficiente para ${it.nameSnapshot}`, 409, "INSUFFICIENT_STOCK");
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

    // 8) Movimientos de stock
    await StockMovement.insertMany(
      saleItems.map(it => ({
        productId: it.productId,
        type: "OUT",
        reason: "SALE",
        qty: it.qty,
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
