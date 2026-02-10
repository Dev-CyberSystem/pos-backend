import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/shifts.service.js";
import * as ledgerService from "../services/shiftLedger.service.js";
import Shift from "../models/Shift.js";


export const open = asyncHandler(async (req, res) => {
  const shift = await service.openShift(req.body, req.user.id);
  res.status(201).json({ ok: true, data: shift });
});

export const today = asyncHandler(async (req, res) => {
  // date viene como query ?date=YYYY-MM-DD
  const date = req.query.date;
  const data = await service.getTodayShifts(date);
  res.json({ ok: true, data });
});

export const close = asyncHandler(async (req, res) => {
  const shiftId = req.params.id;
  const { closingCashCounted } = req.body;

  const ledger = await ledgerService.closeShiftAndCompute({
    shiftId,
    closingCashCounted: Number(closingCashCounted),
    userId: req.user.id,
  });

  res.json({ ok: true, data: ledger }); // devolvemos el resumen final (UX top)
});

export const createCashMovement = asyncHandler(async (req, res) => {
  const shiftId = req.params.id;
  const mov = await ledgerService.createCashMovement({
    shiftId,
    input: req.body,
    userId: req.user.id,
  });
  res.status(201).json({ ok: true, data: mov });
});

export const getLedger = asyncHandler(async (req, res) => {
  const shiftId = req.params.id;

   const salesLimit = Math.min(Number(req.query.salesLimit || 500), 2000);
  const cashLimit = Math.min(Number(req.query.cashLimit || 500), 2000);

  const data = await ledgerService.getShiftLedger({ shiftId, salesLimit, cashLimit });
  res.json({ ok: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const { from, to, status, shiftType } = req.query;

  const q = {};
  if (status) q.status = String(status).toUpperCase();
  if (shiftType) q.shiftType = shiftType;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = from;
    if (to) q.date.$lte = to;
  }

  const items = await Shift.find(q).sort({ date: -1, shiftType: 1 }).lean();
  res.json({ ok: true, data: items });
});