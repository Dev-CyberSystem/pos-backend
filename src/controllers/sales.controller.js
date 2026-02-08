import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/sales.service.js";

export const create = asyncHandler(async (req, res) => {
  const sale = await service.createSale(req.body, req.user.id);
  res.status(201).json({ ok: true, data: sale });
});
