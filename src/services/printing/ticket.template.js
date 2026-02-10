// const padRight = (s, n) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
// const padLeft  = (s, n) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s);

// const money = (n) => Number(n || 0).toFixed(2);
// const line = (w = 42, ch = "-") => ch.repeat(w);

// function center(text, width) {
//   const s = String(text ?? "");
//   if (s.length >= width) return s.slice(0, width);
//   const left = Math.floor((width - s.length) / 2);
//   return " ".repeat(left) + s;
// }

// function wrap(text, width) {
//   const s = String(text ?? "");
//   const chunks = s.match(new RegExp(`.{1,${width}}`, "g")) || [""];
//   return chunks;
// }

// // Column widths (80mm)
// const W = 42;
// const COL_NAME = 20;
// const COL_QTY  = 4;
// const COL_PU   = 9;
// const COL_SUB  = 9;

// export function buildTicketText({ business, sale }) {
//   const out = [];

//   // Header
//   if (business?.name) out.push(center(business.name, W));
//   if (business?.address) out.push(center(business.address, W));
//   if (business?.phone) out.push(center(`Tel: ${business.phone}`, W));
//   if (business?.cuit) out.push(center(`CUIT: ${business.cuit}`, W));
//   out.push(line(W));

//   // Meta
//   out.push(`Venta: ${sale._id}`);
//   out.push(`Fecha: ${new Date(sale.dateTime).toLocaleString()}`);
//   if (sale.shiftId?.date && sale.shiftId?.shiftType) {
//     out.push(`Turno: ${sale.shiftId.shiftType}  Dia: ${sale.shiftId.date}`);
//   }
//   out.push(line(W));

//   // Items header
//   out.push(
//     padRight("Item", COL_NAME) +
//     padLeft("Cant", COL_QTY) +
//     padLeft("P.Unit", COL_PU) +
//     padLeft("Sub", COL_SUB)
//   );
//   out.push(line(W));

//   // Items rows
//   for (const it of sale.items) {
//     const name = String(it.nameSnapshot || "").trim();
//     const qty = String(it.qty);
//     const pu = money(it.unitPriceSnapshot);
//     const sub = money(it.subtotal);

//     const nameLines = wrap(name, COL_NAME);

//     // primera línea con columnas
//     out.push(
//       padRight(nameLines[0], COL_NAME) +
//       padLeft(qty, COL_QTY) +
//       padLeft(pu, COL_PU) +
//       padLeft(sub, COL_SUB)
//     );

//     // líneas extra del nombre (solo columna name)
//     for (let i = 1; i < nameLines.length; i++) {
//       out.push(padRight(nameLines[i], COL_NAME));
//     }
//   }

//   out.push(line(W));

//   // Total
//   out.push(padRight("TOTAL", W - COL_SUB) + padLeft(money(sale.total), COL_SUB));
//   out.push("");

//   // Payments
//   out.push("PAGOS:");
//   for (const p of sale.payments || []) {
//     out.push(`- ${p.type}: ${money(p.amount)}`);
//   }

//   out.push(line(W));
//   out.push(center(business?.footer || "Gracias por su compra", W));
//   out.push(""); out.push(""); out.push(""); // feed

//   return out.join("\n");
// }
const padRight = (s, n) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const padLeft  = (s, n) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s);

const money = (n) => Number(n || 0).toFixed(2);
const line = (w = 42, ch = "-") => ch.repeat(w);

function center(text, width) {
  const s = String(text ?? "");
  if (s.length >= width) return s.slice(0, width);
  const left = Math.floor((width - s.length) / 2);
  return " ".repeat(left) + s;
}

function wrap(text, width) {
  const s = String(text ?? "");
  return s.match(new RegExp(`.{1,${width}}`, "g")) || [""];
}

// Column widths (80mm)
const W = 42;
const COL_NAME = 20;
const COL_QTY  = 4;  // acá metemos "2u" o "500g"
const COL_PU   = 9;  // "6500.00"
const COL_SUB  = 9;  // "10500.00"

function formatQty(qty, uom) {
  if (uom === "WEIGHT") return `${qty}g`; // qty en gramos
  return `${qty}u`; // unidades
}

function formatUnitPriceLabel(uom) {
  // En el ticket no entra label largo; lo dejamos en el header
  return uom === "WEIGHT" ? "$/100g" : "$/u";
}

export function buildTicketText({ business, sale }) {
  const out = [];

  // Header
  if (business?.name) out.push(center(business.name, W));
  if (business?.address) out.push(center(business.address, W));
  if (business?.phone) out.push(center(`Tel: ${business.phone}`, W));
  if (business?.cuit) out.push(center(`CUIT: ${business.cuit}`, W));
  out.push(line(W));

  // Meta
  out.push(`Venta: ${sale._id}`);
  out.push(`Fecha: ${new Date(sale.dateTime).toLocaleString()}`);
  if (sale.shiftId?.date && sale.shiftId?.shiftType) {
    out.push(`Turno: ${sale.shiftId.shiftType}  Dia: ${sale.shiftId.date}`);
  }
  out.push(line(W));

  // Items header
  // Para que sea claro: P.Unit es $/u o $/100g según el ítem; lo mostramos por línea con el valor y el usuario lo entiende.
  out.push(
    padRight("Item", COL_NAME) +
    padLeft("Cant", COL_QTY) +
    padLeft("P.Unit", COL_PU) +
    padLeft("Sub", COL_SUB)
  );
  out.push(line(W));

  for (const it of sale.items) {
    const name = String(it.nameSnapshot || "").trim();
    const qtyStr = formatQty(it.qty, it.uomSnapshot);
    const pu = money(it.unitPriceSnapshot);
    const sub = money(it.subtotal);

    const nameLines = wrap(name, COL_NAME);

    // línea principal
    out.push(
      padRight(nameLines[0], COL_NAME) +
      padLeft(qtyStr, COL_QTY) +
      padLeft(pu, COL_PU) +
      padLeft(sub, COL_SUB)
    );

    // líneas extra del nombre
    for (let i = 1; i < nameLines.length; i++) {
      out.push(padRight(nameLines[i], COL_NAME));
    }

    // Nota corta de unidad de precio si es WEIGHT (opcional)
    // (si querés que aparezca explícito, descomentá)
    // if (it.uomSnapshot === "WEIGHT") out.push(padRight("   (precio por 100g)", COL_NAME));
  }

  out.push(line(W));
  out.push(padRight("TOTAL", W - COL_SUB) + padLeft(money(sale.total), COL_SUB));
  out.push("");

  // Payments
  out.push("PAGOS:");
  for (const p of sale.payments || []) {
    out.push(`- ${p.type}: ${money(p.amount)}`);
  }

  out.push(line(W));
  out.push(center(business?.footer || "Gracias por su compra", W));
  out.push(""); out.push(""); out.push(""); // feed

  return out.join("\n");
}
