import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/stock.service.js";

export const createMovement = asyncHandler(async (req, res) => {
  const mov = await service.createStockMovement(req.body, req.user.id);
  res.status(201).json({ ok: true, data: mov });
});

export const listMovements = asyncHandler(async (req, res) => {
  const productId = req.query.productId;
  const limit = req.query.limit;
  const items = await service.listStockMovements({ productId, limit });
  res.json({ ok: true, data: items });
});
