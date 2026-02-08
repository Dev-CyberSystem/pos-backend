import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/shifts.controller.js";
import { openShiftSchema, closeShiftSchema } from "../validators/shifts.schemas.js";

const router = Router();

router.use(authRequired);

router.get("/today", ctrl.today);
router.post("/open", validate(openShiftSchema), ctrl.open);
router.post("/:id/close", validate(closeShiftSchema), ctrl.close);

export default router;
