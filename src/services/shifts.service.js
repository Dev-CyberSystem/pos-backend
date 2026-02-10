import Shift from "../models/Shift.js";
import Sale from "../models/Sale.js";
import { AppError } from "../utils/errors.js";

export async function openShift({ date, shiftType, openingCash }, userId) {
  const open = await Shift.findOne({ date, shiftType, status: "OPEN" });
  if (open) throw new AppError("Ese turno ya está abierto", 409, "SHIFT_EXISTS");

  const closed = await Shift.findOne({ date, shiftType, status: "CLOSED" });

  if (closed) {
    closed.status = "OPEN";
    closed.openedBy = userId;
    closed.openingCash = openingCash ?? closed.openingCash ?? 0;
    closed.openedAt = new Date();
    closed.closedAt = undefined;
    closed.closedBy = undefined;
    closed.closingCashCounted = undefined;
    // opcional: reset totals del cierre anterior
    closed.totalsByPayment = { CASH: 0, DEBIT: 0, TRANSFER: 0, CREDIT: 0 };
    closed.cashExpected = closed.openingCash || 0;
    closed.cashDifference = 0;

    await closed.save();
    return closed;
  }

  return Shift.create({
    date,
    shiftType,
    openedBy: userId,
    openingCash: openingCash ?? 0,
    status: "OPEN",
    openedAt: new Date(),
  });
}

function todayYYYYMMDD() {
  return new Date().toLocaleDateString("en-CA");
}

export async function getTodayShifts(date) {
  const d = date || todayYYYYMMDD();
  return Shift.find({ date: d }).sort({ shiftType: 1 }).lean();
}


// export async function getTodayShifts(date) {
//   const shifts = await Shift.find({ date }).sort({ shiftType: 1 }).lean();
//   return shifts;
// }

export async function closeShift(shiftId, { closingCashCounted }, userId) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new AppError("Turno no encontrado", 404, "SHIFT_NOT_FOUND");
  if (shift.status === "CLOSED") throw new AppError("Turno ya cerrado", 409, "SHIFT_CLOSED");

  // Totales por medio de pago a partir de ventas del turno
 const totals = await Sale.aggregate([
  { $match: { shiftId: shift._id, status: "COMPLETED" } },
  { $unwind: "$payments" },
  { $group: { _id: "$payments.type", total: { $sum: "$payments.amount" } } },
]);

  const totalsByPayment = { CASH: 0, DEBIT: 0, TRANSFER: 0, CREDIT: 0 };
  for (const t of totals) totalsByPayment[t._id] = t.total;

  const cashExpected = (shift.openingCash || 0) + (totalsByPayment.CASH || 0);
  const cashDifference = (closingCashCounted ?? 0) - cashExpected;

  shift.status = "CLOSED";
  shift.closedAt = new Date();
  shift.closedBy = userId;
  shift.closingCashCounted = closingCashCounted ?? 0;
  shift.totalsByPayment = totalsByPayment;
  shift.cashExpected = cashExpected;
  shift.cashDifference = cashDifference;

  await shift.save();
  return shift;
}
