import express from "express";
import cors from "cors";
import morgan from "morgan";

import routes from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";



const app = express();
app.set("trust proxy", 1);

// Middlewares base
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (!env.isProd) return cb(null, true);

      const ok = env.CORS_ORIGINS.includes(origin);
      return ok ? cb(null, true) : cb(new Error("CORS blocked"), false);
    },
    credentials: false, // true solo si usás cookies
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "pos-backend", time: new Date().toISOString() });
});

// API
app.use("/api", routes);

// Not found + error handler
app.use(notFound);
app.use(errorHandler);




export default app;
