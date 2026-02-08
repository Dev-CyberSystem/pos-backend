import { AppError } from "../utils/errors.js";

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(msg, 400, "VALIDATION_ERROR"));
    }
    req.body = result.data;
    next();
  };
}
