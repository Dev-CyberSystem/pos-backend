import PrintJob from "../models/PrintJob.js";
import Sale from "../models/Sale.js";

function requireAgent(req) {
  const token = req.header("x-agent-token");
  if (!token || token !== process.env.AGENT_TOKEN) {
    return false;
  }
  return true;
}

export async function getNextJob(req, res) {
  if (!requireAgent(req)) return res.status(401).json({ ok: false, error: "AGENT_UNAUTHORIZED" });

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
  if (!requireAgent(req)) return res.status(401).json({ ok: false, error: "AGENT_UNAUTHORIZED" });

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
