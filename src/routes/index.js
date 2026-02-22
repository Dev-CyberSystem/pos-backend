import { Router } from "express";
import authRoutes from "./auth.routes.js";
import shiftsRoutes from "./shifts.routes.js";
import stockRoutes from "./stock.routes.js";
import productsRoutes from "./products.routes.js";
import salesRoutes from "./sales.routes.js";
import printingRoutes from "./printing.routes.js";
import reportsRoutes from "./reports.routes.js";
import printAgentRoutes from "./printAgent.routes.js";

const router = Router();

// Placeholder: después enchufamos módulos reales
router.get("/", (req, res) => {
  res.json({ ok: true, message: "POS API" });
});

router.use("/auth", authRoutes);
router.use("/shifts", shiftsRoutes);
router.use("/products", productsRoutes);
router.use("/stock", stockRoutes);
router.use("/sales", salesRoutes);
router.use("/", printingRoutes);
router.use("/reports", reportsRoutes);
router.use("/", printAgentRoutes);

export default router;
