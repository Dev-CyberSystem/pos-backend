export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;

  const payload = {
    ok: false,
    error: err.code || "INTERNAL_ERROR",
    message: err.message || "Unexpected error",
  };

  // En dev devolvemos stack para debug
  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
