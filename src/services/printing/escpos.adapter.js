import escpos from "escpos";
import USB from "escpos-usb";

// A veces ayuda en Windows
escpos.USB = USB; 

const ENC = process.env.PRINTER_ENCODING || "CP850";

// function parseHexEnv(name) {
//   const v = process.env[name];
//   if (!v) throw new Error(`Falta ${name} en .env`);
//   // admite "0x04b8" o "04b8"
//   const clean = v.startsWith("0x") ? v : "0x" + v;
//   return parseInt(clean, 16);
// }

function parseVidPid(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en .env`);

  // Acepta: "0x0416", "0416", "1046"
  if (/^0x/i.test(v)) return parseInt(v, 16);
  if (/^[0-9]+$/.test(v)) return parseInt(v, 10);
  return parseInt(v, 16); // fallback
}

function getUsbDevice() {
  const vid = parseVidPid("PRINTER_VENDOR_ID");
  const pid = parseVidPid("PRINTER_PRODUCT_ID");
  return new USB(vid, pid);
}

export async function printText(text) {
  const device = getUsbDevice();
  const printer = new escpos.Printer(device, { encoding: ENC });

  return new Promise((resolve, reject) => {
    device.open((err) => {
      if (err) return reject(err);

      try {
        printer
          .encode(ENC)
          .text(text)
          .cut()
          .close();

        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  });
}
