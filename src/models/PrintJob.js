import mongoose from "mongoose";

const PrintJobSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    text: { type: String, required: true },

    status: { type: String, enum: ["PENDING", "PRINTING", "OK", "FAIL"], default: "PENDING" },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },

    claimedAt: { type: Date },
    doneAt: { type: Date },
  },
  { timestamps: true }
);

PrintJobSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model("PrintJob", PrintJobSchema);
