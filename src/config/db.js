import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(uri) {
  const mongoUri = uri || env.MONGO_URI;

  mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
  mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err));
  mongoose.connection.on("disconnected", () => console.log("⚠️ MongoDB disconnected"));

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    autoIndex: env.NODE_ENV !== "production",
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
