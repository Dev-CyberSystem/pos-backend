import Shift from "../models/Shift.js";
import Sale from "../models/Sale.js";
import CashMovement from "../models/cashMovement.model.js";
import { AppError } from "../utils/errors.js";

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function emptyTotals() {
  return { CASH: 0, DEBIT: 0, TRANSFER: 0, CREDIT: 0, QR: 0 };
}

function sumPaymentsByType(sales) {
  const acc = emptyTotals();
  for (const s of sales) {
    for (const p of s.payments || []) {
      if (!(p.type in acc)) continue;
      acc[p.type] = round2(acc[p.type] + Number(p.amount || 0));
    }
  }
  return acc;
}

function sumCashMovements(cashMovements) {
  const cashIn = round2(
    cashMovements
      .filter((m) => m.type === "IN")
      .reduce((a, m) => a + Number(m.amount || 0), 0),
  );

  const cashOut = round2(
    cashMovements
      .filter((m) => m.type === "OUT")
      .reduce((a, m) => a + Number(m.amount || 0), 0),
  );

  return { cashIn, cashOut };
}

export async function createCashMovement({ shiftId, input, userId }) {
  const shift = await Shift.findById(shiftId).lean();
  if (!shift) throw new AppError("Turno no encontrado", 404, "NOT_FOUND");
  if (String(shift.status).toUpperCase() !== "OPEN") {
    throw new AppError("El turno no está OPEN", 400, "SHIFT_NOT_OPEN");
  }

  const mov = await CashMovement.create({
    shiftId,
    userId,
    type: input.type,
    reason: input.reason,
    amount: round2(input.amount),
    note: input.note,
  });

  return mov.toObject();
}

/**
 * ✅ Ajuste de apertura: registrar efectivo encontrado + nota.
 * Esto NO cambia openingCash (bloqueado), solo crea diferencia.
 */
export async function setOpeningAdjustment({
  shiftId,
  openingCashCounted,
  openingNote,
  userId,
}) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new AppError("Turno no encontrado", 404, "NOT_FOUND");
  if (String(shift.status).toUpperCase() !== "OPEN") {
    throw new AppError("El turno no está OPEN", 400, "SHIFT_NOT_OPEN");
  }

  const counted = Number(openingCashCounted);
  if (!Number.isFinite(counted) || counted < 0) {
    throw new AppError("openingCashCounted inválido", 400, "VALIDATION_ERROR");
  }

  const system = Number(shift.openingCash || 0);

  shift.openingCashCounted = counted;
  shift.openingDifference = round2(counted - system);
  shift.openingNote = (openingNote || "").trim() || undefined;
  shift.openingAdjustedAt = new Date();
  shift.openingAdjustedBy = userId;

  await shift.save();
  return shift.toObject();
}

export async function getShiftLedger({ shiftId, salesLimit = 1000, cashLimit = 1000 }) {
  const shift = await Shift.findById(shiftId).lean();
  if (!shift) throw new AppError("Turno no encontrado", 404, "NOT_FOUND");

  const sales = await Sale.find({ shiftId })
    .sort({ dateTime: 1 })
    .limit(salesLimit)
    .lean();

  const cashMovements = await CashMovement.find({ shiftId })
    .sort({ createdAt: 1 })
    .limit(cashLimit)
    .populate("userId", "name email")
    .lean();

  const totalsByPayment = sumPaymentsByType(sales);

  const openingCashSystem = Number(shift.openingCash || 0);
  const openingCashReal = Number(shift.openingCashCounted ?? openingCashSystem);

  const cashSales = Number(totalsByPayment.CASH || 0);

  // ✅ 1) Primero calculás cashIn/cashOut
  const { cashIn, cashOut } = sumCashMovements(cashMovements);

  // ✅ 2) Recién ahora podés usar cashIn
  const cashIncomeTotal = round2(cashSales + cashIn);

  // ✅ esperado (salvo inicial real + ventas cash + ingresos - salidas)
  const cashExpected = round2(openingCashReal + cashSales + cashIn - cashOut);

  const cashCounted =
    shift.closingCashCounted == null ? null : Number(shift.closingCashCounted);

  const cashDifference =
    cashCounted == null ? null : round2(cashCounted - cashExpected);

  const grossTotal = round2(sales.reduce((a, s) => a + Number(s.total || 0), 0));

  const summary = {
    salesCount: sales.length,
    grossTotal,
    totalsByPayment,

    openingCashSystem: round2(openingCashSystem),
    openingCash: round2(openingCashReal),
    openingCashCounted: shift.openingCashCounted ?? null,
    openingDifference:
      shift.openingCashCounted == null
        ? null
        : round2(openingCashReal - openingCashSystem),
    openingNote: shift.openingNote || null,

    cashSales: round2(cashSales),           // ✅ ventas en efectivo
    cashIn: round2(cashIn),                 // ✅ ingresos manuales
    cashOut: round2(cashOut),               // ✅ salidas manuales
    cashIncomeTotal: round2(cashIncomeTotal), // ✅ TOTAL efectivo que ingresó

    cashExpected,
    cashCounted,
    cashDifference,
  };

  return { shift, sales, cashMovements, summary };
}

/**
 * Cierre “pro”: calcula y persiste totalsByPayment, cashExpected y cashDifference
 * usando ventas + cash movements del turno.
 */
export async function closeShiftAndCompute({
  shiftId,
  closingCashCounted,
  userId,
}) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new AppError("Turno no encontrado", 404, "NOT_FOUND");
  if (String(shift.status).toUpperCase() !== "OPEN") {
    throw new AppError("El turno no está OPEN", 400, "SHIFT_NOT_OPEN");
  }

  const sales = await Sale.find({ shiftId }).lean();
  const cashMovements = await CashMovement.find({ shiftId }).lean();

  const totalsByPayment = sumPaymentsByType(sales);
  const { cashIn, cashOut } = sumCashMovements(cashMovements);

  const openingCashSystem = Number(shift.openingCash || 0);
  const openingCashReal = Number(shift.openingCashCounted ?? openingCashSystem);

  const cashSales = Number(totalsByPayment.CASH || 0);

  const cashExpected = round2(openingCashReal + cashSales + cashIn - cashOut);
  const cashDiff = round2(Number(closingCashCounted) - cashExpected);

  shift.status = "CLOSED";
  shift.closedAt = new Date();
  shift.closedBy = userId;
  shift.closingCashCounted = Number(closingCashCounted);

  shift.totalsByPayment = {
    CASH: totalsByPayment.CASH || 0,
    DEBIT: totalsByPayment.DEBIT || 0,
    TRANSFER: totalsByPayment.TRANSFER || 0,
    CREDIT: totalsByPayment.CREDIT || 0,
    QR: totalsByPayment.QR || 0,
  };

  shift.cashExpected = cashExpected;
  shift.cashDifference = cashDiff;

  await shift.save();

  const ledger = await getShiftLedger({
    shiftId,
    salesLimit: 2000,
    cashLimit: 2000,
  });
  return ledger;
}
