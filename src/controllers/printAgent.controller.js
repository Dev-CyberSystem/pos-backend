import PrintJob from "../models/PrintJob.js";
import Sale from "../models/Sale.js";

console.log("AGENT_TOKEN set?", !!process.env.AGENT_TOKEN);

// function requireAgent(req, res) {
//     console.log("agent token received?", !!req.header("x-agent-token"));
//   const token = req.header("x-agent-token");

//   if (!process.env.AGENT_TOKEN) {
//     return res.status(500).json({ ok: false, error: "AGENT_TOKEN_NOT_SET" });
//   }

//   if (!token || token !== process.env.AGENT_TOKEN) {
//     return res.status(401).json({ ok: false, error: "AGENT_UNAUTHORIZED" });
//   }

//   return null;
// }
function mask(v) {
  if (!v) return "";
  return String(v).slice(0, 4) + "..." + String(v).slice(-4);
}

export function requireAgent(req, res) {
  const token =
    req.get("x-agent-token") ||
    req.header("x-agent-token") ||
    req.headers["x-agent-token"];

  console.log("AGENT debug:", {
    received: !!token,
    receivedMasked: mask(token),
    envSet: !!process.env.AGENT_TOKEN,
    envMasked: mask(process.env.AGENT_TOKEN),
  });

  if (!process.env.AGENT_TOKEN) {
    return res.status(500).json({ ok: false, error: "AGENT_TOKEN_NOT_SETT" });
  }

  if (!token || token !== process.env.AGENT_TOKEN) {
    return res.status(401).json({ ok: false, error: "AGENT_UNAUTHORIZEDD" });
  }

  return null;
}



export async function getNextJob(req, res) {
  const denied = requireAgent(req, res);
  if (denied) return;


  const job = await PrintJob.findOneAndUpdate(
    { status: "PENDING" },
    { $set: { status: "PRINTING", claimedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  ).lean();

  if (!job) return res.status(204).send();

  res.json({
    ok: true,
    data: {
      jobId: String(job._id),
      saleId: String(job.saleId),
      text: job.text,
    },
  });
}

export async function postJobResult(req, res) {
  const denied = requireAgent(req, res);
  if (denied) return;

  const { success, message } = req.body || {};
  const jobId = req.params.jobId;

  const job = await PrintJob.findById(jobId);
  if (!job) return res.status(404).json({ ok: false, error: "JOB_NOT_FOUND" });

  job.status = success ? "OK" : "FAIL";
  job.lastError = success ? "" : String(message || "Error de impresión");
  job.doneAt = new Date();
  await job.save();

  await Sale.updateOne(
    { _id: job.saleId },
    {
      $set: {
        ticketPrinted: !!success,
        ticketPrintError: success ? "" : job.lastError,
      },
    }
  );

  res.json({ ok: true, data: { jobId: String(job._id), status: job.status } });
}
