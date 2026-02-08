import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/stock.service.js";

export const createMovement = asyncHandler(async (req, res) => {
  const movement = await service.createMovement(req.body, req.user.id);
  res.status(201).json({ ok: true, data: movement });
});

export const listMovements = asyncHandler(async (req, res) => {
  const data = await service.listMovements(req.query);
  res.json({ ok: true, ...data });
});
