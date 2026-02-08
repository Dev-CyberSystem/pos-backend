import { Router } from "express";

const router = Router();

// Placeholder: después enchufamos módulos reales
router.get("/", (req, res) => {
  res.json({ ok: true, message: "POS API" });
});

// Ejemplo de montaje (los creamos en el próximo paso):
// import authRoutes from "./auth.routes.js";
// router.use("/auth", authRoutes);

export default router;
