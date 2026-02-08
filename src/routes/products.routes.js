import { Router } from "express";
import { authRequired } from "../middlewares/authRequired.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import * as ctrl from "../controllers/products.controller.js";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "../validators/products.schemas.js";

const router = Router();

router.use(authRequired);

// listar/leer: admin y cashier
router.get("/", validateQuery(listProductsQuerySchema), ctrl.list);
router.get("/:id", ctrl.getById);

// escribir: solo admin
router.post("/", requireRole("admin"), validate(createProductSchema), ctrl.create);
router.put("/:id", requireRole("admin"), validate(updateProductSchema), ctrl.update);
router.patch("/:id/toggle-active", requireRole("admin"), ctrl.toggleActive);

export default router;
