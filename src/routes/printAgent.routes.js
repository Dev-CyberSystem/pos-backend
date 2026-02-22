import { Router } from "express";
import { getNextJob, postJobResult } from "../controllers/printAgent.controller.js";

const router = Router();

// No authRequired acá. El agente usa x-agent-token.
router.get("/print-agent/next", getNextJob);
router.post("/print-agent/:jobId/result", postJobResult);

export default router;
