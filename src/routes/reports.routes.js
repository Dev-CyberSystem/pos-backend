// import { Router } from "express";
// import { authRequired } from "../middlewares/authRequired.js";
// import { requireRole } from "../middlewares/requireRole.js";
// import { salesSummary, productsReport } from "../controllers/reports.controller.js";

// const router = Router();

// // Podés hacerlo admin-only (recomendado al principio)
// router.get("/sales/summary", authRequired, requireRole("admin"), salesSummary);
// router.get("/products", authRequired, requireRole("admin"), productsReport);

// export default router;
import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { requireRole } from "../middlewares/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Sale from "../models/Sale.js";
import Shift from "../models/Shift.js";

const router = Router();

function toDateStart(yyyyMMdd) {
  return new Date(`${yyyyMMdd}T00:00:00`);
}
function toDateEndInclusive(yyyyMMdd) {
  return new Date(`${yyyyMMdd}T23:59:59.999`);
}

// GET /api/reports/sales/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month|shift
router.get(
  "/sales/summary",
  authRequired,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { from, to, groupBy = "day" } = req.query;
    if (!from || !to) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "from y to requeridos" });
    }

    const fromDt = toDateStart(from);
    const toDt = toDateEndInclusive(to);

    const groupId =
      groupBy === "month"
        ? { y: { $year: "$dateTime" }, m: { $month: "$dateTime" } }
        : groupBy === "week"
        ? { y: { $year: "$dateTime" }, w: { $isoWeek: "$dateTime" } }
        : groupBy === "shift"
        ? "$shiftId"
        : { y: { $year: "$dateTime" }, m: { $month: "$dateTime" }, d: { $dayOfMonth: "$dateTime" } };

    const pipeline = [
      { $match: { dateTime: { $gte: fromDt, $lte: toDt }, status: "COMPLETED" } },
      { $unwind: "$payments" },
      {
        $group: {
          _id: { period: groupId, payType: "$payments.type" },
          amount: { $sum: "$payments.amount" },
          salesSet: { $addToSet: "$_id" },
        },
      },
      {
        $group: {
          _id: "$_id.period",
          totalsByPayment: { $push: { k: "$_id.payType", v: "$amount" } },
          salesCount: { $first: { $size: "$salesSet" } },
          grossTotal: { $sum: "$amount" },
        },
      },
      { $addFields: { totalsByPayment: { $arrayToObject: "$totalsByPayment" } } },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1, "_id.w": 1 } },
    ];

    let rows = await Sale.aggregate(pipeline);

    if (groupBy === "shift") {
      const shiftIds = rows.map((r) => r._id).filter(Boolean);
      const shifts = await Shift.find({ _id: { $in: shiftIds } }).lean();
      const map = new Map(shifts.map((s) => [String(s._id), s]));
      rows = rows.map((r) => ({ ...r, shift: map.get(String(r._id)) || null }));
    }

    res.json({ ok: true, data: rows });
  })
);

// GET /api/reports/products?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
router.get(
  "/products",
  authRequired,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const limit = Number(req.query.limit || 50);

    if (!from || !to) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "from y to requeridos",
      });
    }

    const fromDt = toDateStart(from);
    const toDt = toDateEndInclusive(to);

    const pipeline = [
      { $match: { dateTime: { $gte: fromDt, $lte: toDt }, status: "COMPLETED" } },
      { $unwind: "$items" },

      // Normalizamos costo por línea:
      // UNIT: qty * unitCostSnapshot
      // WEIGHT: (grams/100) * costPer100g
      {
        $addFields: {
          "items.costLine": {
            $cond: [
              { $eq: ["$items.uomSnapshot", "WEIGHT"] },
              {
                $multiply: [
                  { $divide: ["$items.qty", 100] }, // grams -> "hundreds of grams"
                  "$items.unitCostSnapshot",        // $/100g
                ],
              },
              { $multiply: ["$items.qty", "$items.unitCostSnapshot"] }, // UNIT
            ],
          },
        },
      },

      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.nameSnapshot" },
          uom: { $first: "$items.uomSnapshot" },

          qtyTotal: { $sum: "$items.qty" },     // UNIT=unidades, WEIGHT=gramos
          revenue: { $sum: "$items.subtotal" }, // ya viene correcto
          cost: { $sum: "$items.costLine" },    // ✅ ahora correcto
        },
      },

      { $addFields: { margin: { $subtract: ["$revenue", "$cost"] } } },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ];

    const rows = await Sale.aggregate(pipeline);
    res.json({ ok: true, data: rows });
  })
);


export default router;
