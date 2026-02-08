import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function authRequired(req, _res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");

  if (!token) return next(new AppError("Token requerido", 401, "NO_TOKEN"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(new AppError("Token inválido", 401, "INVALID_TOKEN"));
  }
}
