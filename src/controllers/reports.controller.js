import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/reports.service.js";

export const salesSummary = asyncHandler(async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const groupBy = req.query.groupBy || "day";

  if (!from || !to) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "from y to requeridos" });

  const data = await svc.salesSummary({ from, to, groupBy });
  res.json({ ok: true, data });
});

export const productsReport = asyncHandler(async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit || "50";

  if (!from || !to) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "from y to requeridos" });

  const data = await svc.productsReport({ from, to, limit });
  res.json({ ok: true, data });
});
