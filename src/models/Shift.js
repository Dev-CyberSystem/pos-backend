// // /src/models/Shift.js
// import mongoose from "mongoose";
// import { ShiftTypes } from "./enums.js";

// const ShiftSchema = new mongoose.Schema(
//   {
//     date: { type: String, required: true, index: true }, // "YYYY-MM-DD" (simple y sólido para reportes)
//     shiftType: { type: String, enum: ShiftTypes, required: true },

//     status: {
//       type: String,
//       enum: ["OPEN", "CLOSED"],
//       default: "OPEN",
//       index: true,
//     },

//     openedAt: { type: Date, default: Date.now },
//     openedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     openingCash: { type: Number, default: 0, min: 0 },

//     closedAt: { type: Date },
//     closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     closingCashCounted: { type: Number, min: 0 },

//     // calculados al cierre
//     totalsByPayment: {
//       CASH: { type: Number, default: 0, min: 0 },
//       DEBIT: { type: Number, default: 0, min: 0 },
//       TRANSFER: { type: Number, default: 0, min: 0 },
//       CREDIT: { type: Number, default: 0, min: 0 },
//     },
//     cashExpected: { type: Number, default: 0 },
//     cashDifference: { type: Number, default: 0 },
//     // Shift.js (agregar al schema)
//     openingSourceShiftId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Shift",
//     },

//     // "Apertura bloqueada" (la que viene del turno anterior)
//     openingCash: { type: Number, default: 0, min: 0 },

//     // "Ajuste/arqueo de apertura" (opcional)
//     openingCashCounted: { type: Number, min: 0 }, // lo que encontraron físicamente
//     openingDifference: { type: Number, default: 0 }, // counted - openingCash
//     openingNote: { type: String, trim: true, maxlength: 300 },
//     openingAdjustedAt: { type: Date },
//     openingAdjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true },
// );

// // Un turno por día
// ShiftSchema.index({ date: 1, shiftType: 1 }, { unique: true });

// export default mongoose.model("Shift", ShiftSchema);
// /src/models/Shift.js
import mongoose from "mongoose";
import { ShiftTypes } from "./enums.js";

const ShiftSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    shiftType: { type: String, enum: ShiftTypes, required: true },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
      index: true,
    },

    openedAt: { type: Date, default: Date.now },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ Saldo inicial BLOQUEADO (viene del cierre anterior)
    openingCash: { type: Number, default: 0, min: 0 },

    // ✅ De qué turno salió ese openingCash
    openingSourceShiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },

    // ✅ Ajuste/diferencia de apertura (arqueo inicial)
    openingCashCounted: { type: Number, min: 0 }, // efectivo encontrado
    openingDifference: { type: Number, default: 0 }, // counted - openingCash
    openingNote: { type: String, trim: true, maxlength: 300 },
    openingAdjustedAt: { type: Date },
    openingAdjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closingCashCounted: { type: Number, min: 0 },

    // calculados al cierre
    totalsByPayment: {
      CASH: { type: Number, default: 0, min: 0 },
      DEBIT: { type: Number, default: 0, min: 0 },
      TRANSFER: { type: Number, default: 0, min: 0 },
      CREDIT: { type: Number, default: 0, min: 0 },
      QR: { type: Number, default: 0, min: 0 },
    },

    cashExpected: { type: Number, default: 0 },
    cashDifference: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Un turno por día
ShiftSchema.index({ date: 1, shiftType: 1 }, { unique: true });

export default mongoose.model("Shift", ShiftSchema);
