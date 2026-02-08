import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/shifts.service.js";

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
  const shift = await service.closeShift(req.params.id, req.body, req.user.id);
  res.json({ ok: true, data: shift });
});
