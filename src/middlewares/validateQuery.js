import { AppError } from "../utils/errors.js";

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(msg, 400, "QUERY_VALIDATION_ERROR"));
    }
    req.query = result.data;
    next();
  };
}
