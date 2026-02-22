import { asyncHandler } from "../utils/asyncHandler.js";
import * as printService from "../services/printing/print.service.js";

export const getTicket = asyncHandler(async (req, res) => {
  const data = await printService.getTicketText(req.params.id);
  res.json({ ok: true, data });
});

export const markPrinted = asyncHandler(async (req, res) => {
  const sale = await printService.markTicketPrinted(req.params.id);
  res.json({ ok: true, data: sale });
});

export const markPrintError = asyncHandler(async (req, res) => {
  const { message } = req.body || {};
  const sale = await printService.markTicketPrintError(req.params.id, message);
  res.json({ ok: true, data: sale });
});
export const reprint = asyncHandler(async (req, res) => {
  const data = await printService.reprintTicket(req.params.id, req.user.id);
  res.json({ ok: true, data });
});

export const printResult = asyncHandler(async (req, res) => {
  const sale = await printService.reportPrintResult(req.params.id, req.body, req.user.id);
  res.json({ ok: true, data: sale });
});
// export const printSale = asyncHandler(async (req, res) => {
//   const data = await printService.printSaleTicket(req.params.id, req.user.id);
//   res.json({ ok: true, data });
// });

// export const printSale = asyncHandler(async (req, res) => {
//   const data = await printService.printSaleTicket(req.params.id, { mode: "PRINT" }, req.user.id);
//   res.json({ ok: true, data });
// });

// export const reprintSale = asyncHandler(async (req, res) => {
//   const data = await printService.printSaleTicket(req.params.id, { mode: "REPRINT" }, req.user.id);
//   res.json({ ok: true, data });
// });
// export const printSale = asyncHandler(async (req, res) => {
//   const data = await printService.createPrintJobForSale(req.params.id, { mode: "PRINT" }, req.user.id);
//   res.json({ ok: true, data });
// });

// export const reprintSale = asyncHandler(async (req, res) => {
//   const data = await printService.createPrintJobForSale(req.params.id, { mode: "REPRINT" }, req.user.id);
//   res.json({ ok: true, data });
// });

export const printSale = asyncHandler(async (req, res) => {
  const data = await printService.createPrintJobForSale(req.params.id, { mode: "PRINT" }, req.user.id);
  res.json({ ok: true, data });
});

export const reprintSale = asyncHandler(async (req, res) => {
  const data = await printService.createPrintJobForSale(req.params.id, { mode: "REPRINT" }, req.user.id);
  res.json({ ok: true, data });
});