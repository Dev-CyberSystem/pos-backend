import Shift from "../models/Shift.js";
import Sale from "../models/Sale.js";
import { AppError } from "../utils/errors.js";

function todayYYYYMMDD() {
  return new Date().toLocaleDateString("en-CA");
}

function prevDateYYYYMMDD(date) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function findPrevClosedShift(date, shiftType) {
  if (shiftType === "AFTERNOON") {
    // mismo día, mañana cerrada
    return Shift.findOne({ date, shiftType: "MORNING", status: "CLOSED" }).lean();
  }

  // MORNING: día anterior, tarde cerrada
  const prevDate = prevDateYYYYMMDD(date);
  return Shift.findOne({
    date: prevDate,
    shiftType: "AFTERNOON",
    status: "CLOSED",
  }).lean();
}

function resetCloseFields(shift) {
  shift.closedAt = undefined;
  shift.closedBy = undefined;
  shift.closingCashCounted = undefined;
  shift.cashDifference = 0;
  // totalsByPayment / cashExpected se vuelven a setear abajo
}

function resetOpeningAdjustmentFields(shift) {
  shift.openingCashCounted = undefined;
  shift.openingDifference = 0;
  shift.openingNote = undefined;
  shift.openingAdjustedAt = undefined;
  shift.openingAdjustedBy = undefined;
}

/**
 * ✅ Apertura: openingCash se calcula SIEMPRE desde el cierre anterior.
 * - MORNING: closingCashCounted del AFTERNOON del día anterior
 * - AFTERNOON: closingCashCounted del MORNING del mismo día (debe estar CLOSED)
 *
 * Comportamiento nuevo para evitar loop:
 * - Si existe OPEN => devuelve el existente (idempotente)
 * - Si existe CLOSED => lo reabre (reusa el doc) y recalcula openingCash
 */
export async function openShift({ date, shiftType }, userId) {
  const d = date || todayYYYYMMDD();

  const existing = await Shift.findOne({ date: d, shiftType });

  // ✅ Si existe, resolvemos sin bloquear
  if (existing) {
    const st = String(existing.status || "").toUpperCase();

    // ya está OPEN -> devolvemos (así no rompes UX)
    if (st === "OPEN") return existing.toObject();

    // si está CLOSED -> reabrimos
    if (st === "CLOSED") {
      const prev = await findPrevClosedShift(d, shiftType);

      // regla: tarde requiere mañana cerrada
      if (shiftType === "AFTERNOON" && !prev) {
        throw new AppError(
          "No podés abrir la tarde sin cerrar la mañana del mismo día",
          409,
          "PREV_SHIFT_NOT_CLOSED"
        );
      }

      const openingCash = Number(
        prev?.closingCashCounted ?? prev?.cashExpected ?? 0
      );

      existing.status = "OPEN";
      existing.openedAt = new Date();
      existing.openedBy = userId;

      existing.openingCash = openingCash;
      existing.openingSourceShiftId = prev?._id;

      resetOpeningAdjustmentFields(existing);
      resetCloseFields(existing);

      // inicializamos para ledger consistente
      existing.totalsByPayment = {
        CASH: 0,
        DEBIT: 0,
        TRANSFER: 0,
        CREDIT: 0,
        QR: 0,
      };
      existing.cashExpected = openingCash;
      existing.cashDifference = 0;

      await existing.save();
      return existing.toObject();
    }

    // cualquier otro status raro
    throw new AppError("Estado de turno inválido", 409, "SHIFT_INVALID_STATUS");
  }

  // ✅ No existe: creamos
  const prev = await findPrevClosedShift(d, shiftType);

  if (shiftType === "AFTERNOON" && !prev) {
    throw new AppError(
      "No podés abrir la tarde sin cerrar la mañana del mismo día",
      409,
      "PREV_SHIFT_NOT_CLOSED"
    );
  }

  const openingCash = Number(prev?.closingCashCounted ?? prev?.cashExpected ?? 0);

  const shift = await Shift.create({
    date: d,
    shiftType,
    openedBy: userId,
    openedAt: new Date(),
    status: "OPEN",

    openingCash,
    openingSourceShiftId: prev?._id,

    // ajuste apertura
    openingCashCounted: undefined,
    openingDifference: 0,
    openingNote: undefined,
    openingAdjustedAt: undefined,
    openingAdjustedBy: undefined,

    // inicializamos para que el ledger sea consistente
    totalsByPayment: { CASH: 0, DEBIT: 0, TRANSFER: 0, CREDIT: 0, QR: 0 },
    cashExpected: openingCash,
    cashDifference: 0,
  });

  return shift.toObject();
}

export async function getTodayShifts(date) {
  const d = date || todayYYYYMMDD();
  return Shift.find({ date: d }).sort({ shiftType: 1 }).lean();
}

/**
 * Cierre simple (ventas) — si ya usás closeShiftAndCompute en ledger.service,
 * podés dejar este o reemplazar por el pro.
 */
export async function closeShift(shiftId, { closingCashCounted }, userId) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new AppError("Turno no encontrado", 404, "SHIFT_NOT_FOUND");
  if (shift.status === "CLOSED")
    throw new AppError("Turno ya cerrado", 409, "SHIFT_CLOSED");

  const totals = await Sale.aggregate([
    { $match: { shiftId: shift._id, status: "COMPLETED" } },
    { $unwind: "$payments" },
    { $group: { _id: "$payments.type", total: { $sum: "$payments.amount" } } },
  ]);

  const totalsByPayment = { CASH: 0, DEBIT: 0, TRANSFER: 0, CREDIT: 0, QR: 0 };
  for (const t of totals) totalsByPayment[t._id] = t.total;

  // ✅ Usamos openingCash REAL (si arqueó apertura)
  const openingCashSystem = Number(shift.openingCash || 0);
  const openingCashReal = Number(shift.openingCashCounted ?? openingCashSystem);

  const cashExpected = (openingCashReal || 0) + (totalsByPayment.CASH || 0);
  const cashDifference = (closingCashCounted ?? 0) - cashExpected;

  shift.status = "CLOSED";
  shift.closedAt = new Date();
  shift.closedBy = userId;
  shift.closingCashCounted = closingCashCounted ?? 0;
  shift.totalsByPayment = totalsByPayment;
  shift.cashExpected = cashExpected;
  shift.cashDifference = cashDifference;

  await shift.save();
  return shift.toObject();
}
