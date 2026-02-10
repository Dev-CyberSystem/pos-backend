import Sale from "../models/Sale.js";
import Shift from "../models/Shift.js";

function toDateStart(yyyyMMdd) {
  // interpreta YYYY-MM-DD en local; para métricas va ok
  return new Date(`${yyyyMMdd}T00:00:00`);
}
function toDateEndInclusive(yyyyMMdd) {
  return new Date(`${yyyyMMdd}T23:59:59.999`);
}

export async function salesSummary({ from, to, groupBy = "day" }) {
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

  // payments por tipo: unwind payments
  const pipeline = [
    { $match: { dateTime: { $gte: fromDt, $lte: toDt }, status: "COMPLETED" } },
    { $unwind: "$payments" },
    {
      $group: {
        _id: { period: groupId, payType: "$payments.type" },
        amount: { $sum: "$payments.amount" },
        salesCount: { $addToSet: "$_id" }, // para contar ventas únicas por período
      },
    },
    {
      $group: {
        _id: "$_id.period",
        totalsByPayment: {
          $push: { k: "$_id.payType", v: "$amount" },
        },
        salesCount: { $first: { $size: "$salesCount" } },
        grossTotal: { $sum: "$amount" },
      },
    },
    {
      $addFields: {
        totalsByPayment: { $arrayToObject: "$totalsByPayment" },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1, "_id.w": 1 } },
  ];

  let rows = await Sale.aggregate(pipeline);

  // si groupBy=shift, traemos metadata del turno
  if (groupBy === "shift") {
    const shiftIds = rows.map((r) => r._id).filter(Boolean);
    const shifts = await Shift.find({ _id: { $in: shiftIds } }).lean();
    const map = new Map(shifts.map((s) => [String(s._id), s]));
    rows = rows.map((r) => ({
      ...r,
      shift: map.get(String(r._id)) || null,
    }));
  }

  return rows;
}

export async function productsReport({ from, to, limit = 50 }) {
  const fromDt = toDateStart(from);
  const toDt = toDateEndInclusive(to);

  const pipeline = [
    { $match: { dateTime: { $gte: fromDt, $lte: toDt }, status: "COMPLETED" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.nameSnapshot" },
        uom: { $first: "$items.uomSnapshot" },
        qtyTotal: { $sum: "$items.qty" }, // UNIT=unidades, WEIGHT=gramos
        revenue: { $sum: "$items.subtotal" },
        cost: { $sum: { $multiply: ["$items.unitCostSnapshot", "$items.qty"] } },
      },
    },
    {
      $addFields: {
        margin: { $subtract: ["$revenue", "$cost"] },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) || 50 },
  ];

  return Sale.aggregate(pipeline);
}
