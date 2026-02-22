import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/products.controller.js";
import { createProductSchema, updateProductSchema } from "../validators/products.schemas.js";

const router = Router();
router.use(authRequired);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.post("/", validate(createProductSchema), ctrl.create);
router.put("/:id", validate(updateProductSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
