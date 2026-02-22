import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/printing.controller.js";
import { markPrintErrorSchema, printResultSchema } from "../validators/printing.schemas.js";

const router = Router();

// router.use(authRequired);

// Ver ticket (texto)
router.get("/sales/:id/ticket", ctrl.getTicket);

// Marcar ticket como impreso
router.post("/sales/:id/mark-printed", ctrl.markPrinted);

// Marcar error de impresión
router.post(
  "/sales/:id/mark-print-error",
  validate(markPrintErrorSchema),
  ctrl.markPrintError
);

// Reimpresión (solo genera texto / o job según tu flujo)
router.post("/sales/:id/reprint", ctrl.reprint);

// Reportar resultado (éxito / falla)
router.post("/sales/:id/print-result", validate(printResultSchema), ctrl.printResult);

// ✅ Mantener el endpoint que llama el front:
// Ahora: CREA UN JOB (no imprime)
router.post("/sales/:id/print", ctrl.printSale);
router.post("/sales/:id/reprint", ctrl.reprintSale);

export default router;
