import Sale from "../../models/Sale.js";
import { AppError } from "../../utils/errors.js";
import { buildTicketText } from "./ticket.template.js";

const BUSINESS = {
  name: process.env.BUSINESS_NAME || "MI TIENDA",
  address: process.env.BUSINESS_ADDRESS || "",
  phone: process.env.BUSINESS_PHONE || "",
  cuit: process.env.BUSINESS_CUIT || "",
  footer: process.env.BUSINESS_FOOTER || "Gracias por su compra",
};

export async function getTicketText(saleId) {
  // populate shift para mostrar turno/fecha si querés
  const sale = await Sale.findById(saleId).populate("shiftId", "date shiftType").lean();
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");

  const text = buildTicketText({ business: BUSINESS, sale });
  return { sale, text };
}

export async function markTicketPrinted(saleId) {
  const sale = await Sale.findByIdAndUpdate(
    saleId,
    { $set: { ticketPrinted: true, ticketPrintError: "" } },
    { new: true }
  );
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");
  return sale;
}

export async function markTicketPrintError(saleId, errorMessage) {
  const sale = await Sale.findByIdAndUpdate(
    saleId,
    { $set: { ticketPrinted: false, ticketPrintError: String(errorMessage || "Error de impresión") } },
    { new: true }
  );
  if (!sale) throw new AppError("Venta no encontrada", 404, "SALE_NOT_FOUND");
  return sale;
}
