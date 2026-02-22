function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function listEnv(name, def = []) {
  const v = process.env[name];
  if (!v) return def;
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

export const env = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.PORT || 4000),

  MONGO_URI: requireEnv("MONGO_URI"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  CORS_ORIGINS: isProd ? listEnv("CORS_ORIGINS") : listEnv("CORS_ORIGINS", ["http://localhost:5173"]),
};

