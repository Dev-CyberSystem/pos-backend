import { Router } from "express";
import authRoutes from "./auth.routes.js";
import shiftsRoutes from "./shifts.routes.js";

const router = Router();

// Placeholder: después enchufamos módulos reales
router.get("/", (req, res) => {
  res.json({ ok: true, message: "POS API" });
});

router.use("/auth", authRoutes);
router.use("/shifts", shiftsRoutes);

export default router;
