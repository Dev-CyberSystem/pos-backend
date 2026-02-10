import printer from "@thiagoelg/node-printer";

export function printRawText(text, printerName) {
  const name = printerName || process.env.PRINTER_NAME;
  if (!name) throw new Error("Falta PRINTER_NAME en .env");

  // Importante: RAW manda bytes al driver tal cual
  // Para tickets simples sin tildes raras, UTF-8 suele ir bien.
  // Si ves caracteres raros, cambiamos a 'latin1' o normalizamos.
  const data = Buffer.from(String(text), "utf8");

  const jobId = printer.printDirect({
    data,
    printer: name,
    type: "RAW",
    success: () => {},
    error: (err) => { throw err; },
  });

  return jobId;
}
