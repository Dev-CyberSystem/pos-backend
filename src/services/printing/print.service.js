import mongoose from "mongoose";
import Sale from "../../models/Sale.js";
import { AppError } from "../../utils/errors.js";
import { buildTicketText } from "./ticket.template.js";
// import { printText } from "./escpos.adapter.js";
import { printRawText } from "./raw-windows.adapter.js";

const BUSINESS = {
  name: process.env.BUSINESS_NAME || "MI TIENDA",
  address: process.env.BUSINESS_ADDRESS || "",
  phone: process.env.BUSINESS_PHONE || "",
  cuit: process.env.BUSINESS_CUIT || "",
  footer: process.env.BUSINESS_FOOTER || "Gracias por su compra",
};

export async function getTicketText(saleId) {
  // populate shift para mostrar turno/fecha si querés
  const sale = await Sale.findById(saleId)
    .populate("shiftId", "date shiftType")
    .lean();
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

  const text = buildTicketText({ business: BUSINESS, sale });
  return { sale, text };
}

export async function markTicketPrinted(saleId) {
  const sale = await Sale.findByIdAndUpdate(
    saleId,
    { $set: { ticketPrinted: true, ticketPrintError: "" } },
    { new: true },
  );
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");
  return sale;
}

export async function markTicketPrintError(saleId, errorMessage) {
  const sale = await Sale.findByIdAndUpdate(
    saleId,
    {
      $set: {
        ticketPrinted: false,
        ticketPrintError: String(errorMessage || "Error de impresión"),
      },
    },
    { new: true },
  );
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");
  return sale;
}
export async function reprintTicket(saleId, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(saleId)
      .populate("shiftId", "date shiftType")
      .session(session);
    if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

    // Generar ticket (texto)
    const text = buildTicketText({ business: BUSINESS, sale: sale.toObject() });

    // Marcar intento de reimpresión (sin asumir éxito)
    sale.ticketPrintCount = (sale.ticketPrintCount || 0) + 1;
    sale.ticketLastPrintAt = new Date();
    sale.ticketPrintHistory = sale.ticketPrintHistory || [];
    sale.ticketPrintHistory.push({ action: "REPRINT", note: `User ${userId}` });

    await sale.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { sale, text };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function reportPrintResult(saleId, { success, message }, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

    sale.ticketPrintHistory = sale.ticketPrintHistory || [];

    if (success) {
      sale.ticketPrinted = true;
      sale.ticketPrintError = "";
      sale.ticketPrintHistory.push({
        action: "RESULT_OK",
        note: `User ${userId}`,
      });
    } else {
      sale.ticketPrinted = false;
      sale.ticketPrintError = String(message || "Error de impresión");
      sale.ticketPrintHistory.push({
        action: "RESULT_FAIL",
        note: `${sale.ticketPrintError} | User ${userId}`,
      });
    }

    await sale.save({ session });

    await session.commitTransaction();
    session.endSession();

    return sale;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
// export async function printSaleTicket(saleId, userId) {
//   const enabled = (process.env.PRINTER_ENABLED || "false").toLowerCase() === "true";
//   if (!enabled) throw new AppError("Impresión deshabilitada (PRINTER_ENABLED=false)", 400, "PRINT_DISABLED");

//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const sale = await Sale.findById(saleId).populate("shiftId", "date shiftType").session(session);
//     if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

//     const text = buildTicketText({ business: BUSINESS, sale: sale.toObject() });

//     // intento imprimir
//     try {
//       await printText(text);

//       sale.ticketPrinted = true;
//       sale.ticketPrintError = "";
//       sale.ticketPrintCount = (sale.ticketPrintCount || 0) + 1;
//       sale.ticketLastPrintAt = new Date();
//       sale.ticketPrintHistory = sale.ticketPrintHistory || [];
//       sale.ticketPrintHistory.push({ action: "PRINT", note: `User ${userId}` });

//       await sale.save({ session });
//       await session.commitTransaction();
//       session.endSession();

//       return { sale, text };
//     } catch (printErr) {
//       sale.ticketPrinted = false;
//       sale.ticketPrintError = String(printErr?.message || "Error de impresión");
//       sale.ticketPrintHistory = sale.ticketPrintHistory || [];
//       sale.ticketPrintHistory.push({ action: "RESULT_FAIL", note: `${sale.ticketPrintError} | User ${userId}` });
//       await sale.save({ session });

//       await session.commitTransaction();
//       session.endSession();

//       throw new AppError(sale.ticketPrintError, 500, "PRINT_FAILED");
//     }
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     throw err;
//   }
// }
export async function printSaleTicket(saleId, { mode = "PRINT" } = {}, userId) {
  const enabled = (process.env.PRINTER_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) throw new AppError("Impresión deshabilitada", 400, "PRINT_DISABLED");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(saleId).populate("shiftId", "date shiftType").session(session);
    if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

    const text = buildTicketText({ business: BUSINESS, sale: sale.toObject() });

    // imprimir RAW (Windows spooler)
    const jobId = printRawText(text, process.env.PRINTER_NAME);

    // registrar intento / resultado (asumimos OK si el spooler aceptó el job)
    sale.ticketPrintCount = (sale.ticketPrintCount || 0) + 1;
    sale.ticketLastPrintAt = new Date();
    sale.ticketPrinted = true;
    sale.ticketPrintError = "";
    sale.ticketPrintHistory = sale.ticketPrintHistory || [];
    sale.ticketPrintHistory.push({ action: mode === "REPRINT" ? "REPRINT" : "PRINT", note: `jobId=${jobId} user=${userId}` });

    await sale.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { sale, text, jobId };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // si falla antes de commit, guardamos error fuera de txn (best effort)
    try {
      await Sale.updateOne(
        { _id: saleId },
        { $set: { ticketPrinted: false, ticketPrintError: String(err?.message || "Error de impresión") } }
      );
    } catch {}

    throw err;
  }
}
