const padRight = (s, n) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const padLeft = (s, n) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s);

const money = (n) => {
  const x = Number(n || 0);
  // formato simple ARS sin depender de Intl (para servers sin locale)
  return x.toFixed(2);
};

const line = (w = 42, ch = "-") => ch.repeat(w);

export function buildTicketText({ business, sale }) {
  const width = 42; // 80mm suele ser 42-48 chars. 42 es bastante estándar.
  const out = [];

  // Header
  if (business?.name) out.push(center(business.name, width));
  if (business?.address) out.push(center(business.address, width));
  if (business?.phone) out.push(center(`Tel: ${business.phone}`, width));
  if (business?.cuit) out.push(center(`CUIT: ${business.cuit}`, width));
  out.push(line(width));

  // Meta
  out.push(`Venta: ${sale._id}`);
  out.push(`Fecha: ${new Date(sale.dateTime).toLocaleString()}`);
  if (sale.shiftId?.date && sale.shiftId?.shiftType) {
    out.push(`Turno: ${sale.shiftId.shiftType}  Dia: ${sale.shiftId.date}`);
  }
  out.push(line(width));

  // Items header
  out.push(padRight("Item", 22) + padLeft("Cant", 5) + padLeft("P.Unit", 7) + padLeft("Sub", 8));
  out.push(line(width));

  // Items
  for (const it of sale.items) {
    const name = String(it.nameSnapshot || "").trim();
    const qty = String(it.qty);
    const pu = money(it.unitPriceSnapshot);
    const sub = money(it.subtotal);

    // línea principal
    out.push(
      padRight(name, 22) +
        padLeft(qty, 5) +
        padLeft(pu, 7) +
        padLeft(sub, 8)
    );

    // si el nombre es largo, lo continuamos
    if (name.length > 22) {
      const rest = name.slice(22);
      const chunks = rest.match(/.{1,22}/g) || [];
      for (const c of chunks) out.push(padRight(c, 22));
    }
  }

  out.push(line(width));

  // Total
  out.push(padRight("TOTAL", 34) + padLeft(money(sale.total), 8));
  out.push("");

  // Pagos
  out.push("PAGOS:");
  for (const p of sale.payments || []) {
    out.push(`- ${p.type}: ${money(p.amount)}`);
  }

  out.push(line(width));
  out.push(center(business?.footer || "Gracias por su compra", width));
  out.push(""); // feed
  out.push(""); // feed
  out.push(""); // feed

  return out.join("\n");
}

function center(text, width) {
  const s = String(text);
  if (s.length >= width) return s.slice(0, width);
  const left = Math.floor((width - s.length) / 2);
  return " ".repeat(left) + s;
}
