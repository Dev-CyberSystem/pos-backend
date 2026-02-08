import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function register({ name, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError("Email ya registrado", 409, "EMAIL_EXISTS");

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role: role || "admin" });

  const token = signToken(user);
  return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email, active: true });
  if (!user) throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");

  const ok = await user.verifyPassword(password);
  if (!ok) throw new AppError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");

  const token = signToken(user);
  return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
}
