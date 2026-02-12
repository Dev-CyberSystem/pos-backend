import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import * as ctrl from "../controllers/stock.controller.js";
import { createStockMovementSchema, listStockMovementsQuerySchema } from "../validators/stock.schemas.js";

const router = Router();

router.use(authRequired);
router.use(requireRole("admin")); // movimientos manuales: admin

router.post("/movements", validate(createStockMovementSchema), ctrl.createMovement);
router.get("/movements", validateQuery(listStockMovementsQuerySchema), ctrl.listMovements);
router.get("/summary", authRequired, requireRole("admin"), ctrl.stockSummary);

export default router;
