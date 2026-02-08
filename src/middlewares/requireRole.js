import { AppError } from "../utils/errors.js";

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError("No autenticado", 401, "UNAUTHENTICATED"));
    if (!roles.includes(req.user.role)) return next(new AppError("Sin permisos", 403, "FORBIDDEN"));
    next();
  };
}
