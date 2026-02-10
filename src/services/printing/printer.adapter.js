import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import printerDriver from "@thiagoelg/node-printer";

export function getWindowsPrinter() {
  const name = process.env.PRINTER_NAME;
  if (!name) throw new Error("Falta PRINTER_NAME en .env");

  const typeKey = (process.env.PRINTER_TYPE || "EPSON").toUpperCase();
  const printerType = PrinterTypes[typeKey] || PrinterTypes.EPSON;

  return new ThermalPrinter({
    type: printerType,
    interface: `printer:${name}`,
    driver: printerDriver,
    options: { timeout: 10000 },
  });
}

export async function printTextViaWindows(text) {
  const p = getWindowsPrinter();

  const connected = await p.isPrinterConnected();
  if (!connected) throw new Error(`Impresora no conectada o no encontrada: ${process.env.PRINTER_NAME}`);

  p.clear();

  // imprimimos línea por línea para evitar issues de saltos
  for (const ln of String(text).split("\n")) {
    p.println(ln);
  }

  // feed final (muchas 58mm no tienen cutter)
  p.newLine();
  p.newLine();
  p.newLine();

  // si tiene cutter, esto corta; si no, no pasa nada
  try { p.cut(); } catch {}

  const ok = await p.execute();
  if (!ok) throw new Error("No se pudo ejecutar la impresión");

  return true;
}
