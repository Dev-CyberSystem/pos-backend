import "dotenv/config";

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

async function bootstrap() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`✅ API running on http://localhost:${env.PORT}`);
  });


  const shutdown = (signal) => {
    console.log(`\n🛑 ${signal} received. Shutting down...`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap error:", err);
  process.exit(1);
});
