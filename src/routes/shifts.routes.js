// // import { Router } from "express";
// // import { authRequired } from "../middlewares/authRequired.js";
// // import { validate } from "../middlewares/validate.js";
// // import * as ctrl from "../controllers/shifts.controller.js";
// // import {
// //   openShiftSchema,
// //   closeShiftSchema,
// //   createCashMovementSchema,
// //   ledgerQuerySchema,
// // } from "../validators/shifts.schemas.js";

// // const router = Router();

// // router.use(authRequired);

// // router.get("/today", ctrl.today);
// // router.post("/open", validate(openShiftSchema), ctrl.open);
// // router.post("/:id/close", validate(closeShiftSchema), ctrl.close);
// // router.get(
// //   "/:id/ledger",
// //   authRequired,
// //   validate(ledgerQuerySchema, "query"),
// //   ctrl.getLedger,
// // );

// // // ✅ Movimientos de caja (retiros/ingresos).
// // // Recomendación: solo admin (o cashier+admin si querés)
// // router.post(
// //   "/:id/cash-movements",
// //   authRequired,
// // //   requireRole("admin"),
// //   validate(createCashMovementSchema),
// //   ctrl.createCashMovement,
// // );

// // router.get("/", authRequired,  ctrl.list);

// // export default router;
// import { Router } from "express";
// import { authRequired } from "../middlewares/authRequired.js";
// import { validate } from "../middlewares/validate.js";
// import * as ctrl from "../controllers/shifts.controller.js";
// import {
//   openShiftSchema,
//   closeShiftSchema,
//   createCashMovementSchema,
//   ledgerQuerySchema,
//   openingAdjustmentSchema, // ✅ NUEVO
// } from "../validators/shifts.schemas.js";

// const router = Router();

// router.use(authRequired);

// router.get("/today", ctrl.today);

// // ✅ openShift NO recibe openingCash (solo date + shiftType)
// router.post("/open", validate(openShiftSchema), ctrl.open);

// // ✅ cierre
// router.post("/:id/close", validate(closeShiftSchema), ctrl.close);

// // ✅ ledger (query validated)
// router.get(
//   "/:id/ledger",
//   validate(ledgerQuerySchema, "query"),
//   ctrl.getLedger
// );

// // ✅ ajuste de apertura (efectivo encontrado + nota)
// router.patch(
//   "/:id/opening-adjustment",
//   validate(openingAdjustmentSchema),
//   ctrl.openingAdjustment
// );

// // ✅ Movimientos de caja (retiros/ingresos)
// router.post(
//   "/:id/cash-movements",
//   // requireRole("admin"),
//   validate(createCashMovementSchema),
//   ctrl.createCashMovement
// );

// // ✅ listado
// router.get("/", ctrl.list);

// export default router;

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
