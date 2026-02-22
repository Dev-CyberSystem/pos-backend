export async function printRawText(text, printerName) {
  // Seguridad: este adapter es para Windows
  if (process.platform !== "win32") {
    throw new Error("RAW Windows printing no disponible en este sistema operativo");
  }

  const name = printerName || process.env.PRINTER_NAME;
  if (!name) throw new Error("Falta PRINTER_NAME en .env");

  // Import dinámico: evita que Render/Linux intente cargar/compilar el módulo
  const mod = await import("@thiagoelg/node-printer");
  const printer = mod.default ?? mod;

  const data = Buffer.from(String(text), "utf8");

  // Importante: el error callback NO debe tirar dentro del callback
  // porque puede quedar fuera del try/catch del caller.
  // Mejor envolver en Promise.
  return await new Promise((resolve, reject) => {
    try {
      const jobId = printer.printDirect({
        data,
        printer: name,
        type: "RAW",
        success: (id) => resolve(id ?? jobId),
        error: (err) => reject(err),
      });

      // Algunos drivers devuelven el jobId inmediatamente
      if (jobId != null) resolve(jobId);
    } catch (e) {
      reject(e);
    }
  });
}

