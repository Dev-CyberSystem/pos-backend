import { Router } from "express";
import authRoutes from "./auth.routes.js";
import shiftsRoutes from "./shifts.routes.js";
import stockRoutes from "./stock.routes.js";
import productsRoutes from "./products.routes.js";

const router = Router();

// Placeholder: después enchufamos módulos reales
router.get("/", (req, res) => {
  res.json({ ok: true, message: "POS API" });
});

router.use("/auth", authRoutes);
router.use("/shifts", shiftsRoutes);
router.use("/products", productsRoutes);
router.use("/stock", stockRoutes);

export default router;
