import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/stock.service.js";

const normAll = (v) => (v && v !== "ALL" ? v : undefined);

export const createMovement = asyncHandler(async (req, res) => {
  const mov = await service.createStockMovement(req.body, req.user.id);
  res.status(201).json({ ok: true, data: mov });
});

export const listMovements = asyncHandler(async (req, res) => {
  const { productId, limit, page, type, reason } = req.query;

  const items = await service.listStockMovements({
    productId: normAll(productId), // (si alguna vez mandás "ALL" en UI)
    type: normAll(type),
    reason: normAll(reason),
    limit,
    page,
  });

  res.json({ ok: true, data: items });
});

export const stockSummary = asyncHandler(async (req, res) => {
  const { q, status, uom, limit } = req.query;

  const data = await service.stockSummary({
    q: q?.trim() || undefined,
    status: normAll(status),
    uom: normAll(uom),
    limit,
  });

  res.json({ ok: true, data });
});
