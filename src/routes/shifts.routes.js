import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/shifts.controller.js";
import {
  openShiftSchema,
  closeShiftSchema,
  createCashMovementSchema,
  ledgerQuerySchema,
  openingAdjustmentSchema, // ✅ NUEVO
} from "../validators/shifts.schemas.js";

const router = Router();

router.use(authRequired);

router.get("/today", ctrl.today);

router.post("/open", validate(openShiftSchema), ctrl.open);

router.post("/:id/close", validate(closeShiftSchema), ctrl.close);

router.get(
  "/:id/ledger",
  validate(ledgerQuerySchema, "query"),
  ctrl.getLedger
);

// ✅ NUEVO: ajuste de apertura
router.patch(
  "/:id/opening-adjustment",
  validate(openingAdjustmentSchema),
  ctrl.openingAdjustment
);

// ✅ Movimientos de caja
router.post(
  "/:id/cash-movements",
  // requireRole("admin"),
  validate(createCashMovementSchema),
  ctrl.createCashMovement
);

router.get("/", ctrl.list);

export default router;
