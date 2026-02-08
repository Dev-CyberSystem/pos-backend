import { asyncHandler } from "../utils/asyncHandler.js";
import * as authService from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ ok: true, ...data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ ok: true, ...data });
});
