import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/printing.controller.js";
import { markPrintErrorSchema , printResultSchema } from "../validators/printing.schemas.js";

const router = Router();

router.use(authRequired);

// Ver ticket (texto)
router.get("/sales/:id/ticket", ctrl.getTicket);

// Marcar ticket como impreso
router.post("/sales/:id/mark-printed", ctrl.markPrinted);

// Marcar error de impresión
router.post("/sales/:id/mark-print-error", validate(markPrintErrorSchema), ctrl.markPrintError);

// ✅ Reimpresión
router.post("/sales/:id/reprint", ctrl.reprint);

// ✅ Reportar resultado (éxito / falla)
router.post("/sales/:id/print-result", validate(printResultSchema), ctrl.printResult);

router.post("/sales/:id/print", ctrl.printSale);

router.post("/printer/test", async (req, res, next) => {
  try {
    const { printTextViaWindows } = await import("../services/printing/printer.adapter.js");
    await printTextViaWindows(
      "TEST OK\n" +
      "POS Printer 203DPI Series\n" +
      "--------------------------\n" +
      "Linea 1\nLinea 2\n\n"
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/printer/list", async (req, res, next) => {
  try {
    const { listWindowsPrinters } = await import("../services/printing/raw-windows.adapter.js");
    const printers = listWindowsPrinters();
    res.json({ ok: true, printers });
  } catch (e) {
    next(e);
  }
});

router.post("/printer/test-raw", async (req, res, next) => {
  try {
    const { printRawText } = await import("../services/printing/raw-windows.adapter.js");

    const text =
      "TEST RAW OK\n" +
      "------------------------\n" +
      "Linea 1\nLinea 2\n\n\n\n";

    const jobId = printRawText(text, process.env.PRINTER_NAME);
    res.json({ ok: true, jobId });
  } catch (e) {
    next(e);
  }
});

router.post("/sales/:id/print", ctrl.printSale);
router.post("/sales/:id/reprint", ctrl.reprintSale);




export default router;
