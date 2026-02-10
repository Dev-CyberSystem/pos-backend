// /src/models/enums.js
export const PaymentTypes = ["CASH", "DEBIT", "TRANSFER", "CREDIT"];
export const ShiftTypes = ["MORNING", "AFTERNOON"];
export const StockMovementTypes = ["IN", "OUT", "ADJUST"];
export const StockMovementReasons = ["PURCHASE", "SALE", "RETURN", "LOSS", "MANUAL"];
export const SaleStatus = ["COMPLETED", "CANCELED"];
export const UOM = ["UNIT", "WEIGHT"];
export const CashMovementTypes = ["IN", "OUT"];
export const CashMovementReasons = [
  "WITHDRAWAL", // retiro dueño
  "EXPENSE",    // gasto (flete, insumo, etc.)
  "CHANGE",     // cambio / fondo
  "OTHER",
];


