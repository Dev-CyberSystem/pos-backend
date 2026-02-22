import PrintJob from "../models/PrintJob.js";
import Sale from "../models/Sale.js";

function mask(v) {
  if (!v) return "";
  const s = String(v);
  return s.slice(0, 4) + "..." + s.slice(-4);
}

function requireAgent(req) {
  const raw =
    req.get("x-agent-token") ||
    req.header("x-agent-token") ||
    req.headers["x-agent-token"] ||
    "";

  const token = String(raw).trim();
  const envToken = String(process.env.AGENT_TOKEN || "").trim();

  if (!envToken)
    return { ok: false, status: 500, error: "AGENT_TOKEN_NOT_SET" };
  if (!token || token !== envToken)
    return { ok: false, status: 401, error: "AGENT_UNAUTHORIZED" };

  return { ok: true };
}

export async function getNextJob(req, res) {
  const auth = requireAgent(req);
  if (!auth.ok)
    return res.status(auth.status).json({ ok: false, error: auth.error });

  const job = await PrintJob.findOneAndUpdate(
    { status: "PENDING" },
    {
      $set: { status: "PRINTING", claimedAt: new Date() },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, new: true },
  ).lean();

  if (!job) return res.status(204).send();

  return res.json({
    ok: true,
    data: {
      jobId: String(job._id),
      saleId: String(job.saleId),
      text: job.text,
    },
  });
}

export async function postJobResult(req, res) {
  const auth = requireAgent(req);
  if (!auth.ok)
    return res.status(auth.status).json({ ok: false, error: auth.error });

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
    },
  );

  return res.json({
    ok: true,
    data: { jobId: String(job._id), status: job.status },
  });
}
