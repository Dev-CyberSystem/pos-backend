import mongoose from "mongoose";

const CashMovementSchema = new mongoose.Schema(
  {
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true, index: true },
    type: { type: String, enum: ["IN", "OUT"], required: true },
    reason: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, maxlength: 200 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("CashMovement", CashMovementSchema);
