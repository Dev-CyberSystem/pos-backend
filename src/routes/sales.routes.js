import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/sales.controller.js";
import { createSaleSchema } from "../validators/sales.schemas.js";

const router = Router();

router.use(authRequired);

router.post("/", validate(createSaleSchema), ctrl.create);

export default router;
