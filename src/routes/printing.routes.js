import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/printing.controller.js";
import { markPrintErrorSchema } from "../validators/printing.schemas.js";

const router = Router();

router.use(authRequired);

// Ver ticket (texto)
router.get("/sales/:id/ticket", ctrl.getTicket);

// Marcar ticket como impreso
router.post("/sales/:id/mark-printed", ctrl.markPrinted);

// Marcar error de impresión
router.post("/sales/:id/mark-print-error", validate(markPrintErrorSchema), ctrl.markPrintError);

export default router;
