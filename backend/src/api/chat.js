const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

async function resolveThreadId(sessionId) {
  if (!sessionId) return null;
  try {
    await cw.getThread(sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

// POST /api/chat - Non-streaming send
router.post("/", async (req, res) => {
  try {
    const { sessionId, message, model, mode, workspace } = req.body;
    if (!message) return res.status(400).json({ success: false, error: "message required" });

    let tid = await resolveThreadId(sessionId);
    if (!tid) {
      const t = await cw.createThread({ model, mode: mode || "Agent", auto_approve: true, workspace: workspace || undefined });
      tid = t.id || t.thread?.id;
    }

    const r = await cw.sendMessage(tid, message, { model, mode });
    const txt = r.turn ? JSON.stringify(r) : (r.text || "");

    res.json({ success: true, data: { text: txt, threadId: tid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Shared SSE event forwarding logic
function streamEvents(req, res, tid, opts = {}) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let closed = false;
  let timeout = null;

  const send = (data) => {
    if (closed || res.writableEnded) return;
    res.write("data: " + JSON.stringify(data) + "\n\n");
  };

  const finish = (err) => {
    if (closed) return;
    closed = true;
    if (timeout) clearTimeout(timeout);
    if (err && !res.writableEnded) send({ error: typeof err === "string" ? err : err.message, done: true });
    if (!res.writableEnded) { send({ done: true }); res.end(); }
  };

  if (!tid) return finish("No thread ID");

  const sinceSeq = opts.sinceSeq || 0;
  const evReq = cw.getThreadEvents(tid, sinceSeq);
  let buf = "";
  let lastSeq = sinceSeq - 1;

  evReq.on("response", (sse) => {
    if (closed) return;
    sse.on("data", (chunk) => {
      if (closed) return;
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.seq <= lastSeq) continue;
          lastSeq = ev.seq;
          
          const out = { seq: ev.seq, event: ev.event };
          
          if (ev.payload) {
            const pl = ev.payload;
            switch (ev.event) {
              case "item.started":
                out.item_id = pl.item?.id || pl.id;
                out.kind = pl.item?.kind || pl.kind;
                out.summary = pl.item?.summary || pl.summary || "Working...";
                out.status = "running";
                out.timestamp = Date.now();
                break;
              case "item.delta":
                if (pl.delta) { out.chunk = pl.delta; out.kind = pl.kind || pl.item?.kind; }
                break;
              case "item.completed":
                out.item_id = pl.item?.id || pl.id;
                out.kind = pl.item?.kind || pl.kind;
                out.status = "completed";
                out.summary = pl.item?.summary || pl.summary;
                break;
              case "item.failed":
                out.item_id = pl.item?.id || pl.id;
                out.status = "failed";
                out.error = pl.error || pl.item?.error;
                break;
              case "turn.completed":
                out.turn_id = pl.turn?.id || pl.id;
                if (!opts.noFinishOnTurnComplete) finish();
                break;
              case "turn.failed":
                out.turn_id = pl.turn?.id || pl.id;
                finish(pl.error || "Turn failed");
                break;
              default:
                out.payload = pl;
            }
          }
          send(out);
        } catch (e) {}
      }
    });
    sse.on("end", () => finish());
    sse.on("error", (e) => finish(e.message));
  });
  evReq.on("error", (e) => finish(e.message));

  // Safety timeout
  timeout = setTimeout(() => { if (!closed) finish("Stream timeout"); }, 120000);

  // Handle client disconnect
  req.on("close", () => { if (!closed) { closed = true; if (timeout) clearTimeout(timeout); } });

  return { finish, closed: () => closed };
}

// POST /api/chat/stream - Streaming send via SSE
router.post("/stream", async (req, res) => {
  try {
    const { sessionId, message, model, mode, workspace } = req.body;
    if (!message) return res.json({ success: false, error: "message required" });

    let tid = await resolveThreadId(sessionId);
    const isNewThread = !tid;
    if (!tid) {
      const t = await cw.createThread({ model, mode: mode || "Agent", auto_approve: true, workspace: workspace || undefined });
      tid = t.id || t.thread?.id;
      if (!tid) return res.json({ success: false, error: "Failed to create thread" });
    }

    if (isNewThread) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
      res.write("data: " + JSON.stringify({ thread_id: tid }) + "\n\n");
    }

    const stream = streamEvents(req, res, tid, { noFinishOnTurnComplete: false });

    // Fire turn AFTER events listener is set up
    setTimeout(() => {
      if (stream.closed()) return;
      cw.sendMessage(tid, message, { model, mode }).catch((e) => {
        if (!stream.closed()) stream.finish(e.message);
      });
    }, 500);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// GET /api/chat/stream/:sessionId - Reconnect to live turn events
router.get("/stream/:sessionId", async (req, res) => {
  try {
    const tid = await resolveThreadId(req.params.sessionId);
    if (!tid) return res.status(404).json({ success: false, error: "Thread not found" });

    // Send a sync event so frontend knows this is a reconnect
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write("data: " + JSON.stringify({ reconnect: true, thread_id: tid }) + "\n\n");

    streamEvents(req, res, tid, { noFinishOnTurnComplete: true, sinceSeq: 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

