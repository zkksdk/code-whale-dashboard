const express = require("express");

const router = express.Router();

const cw = require("../services/codewhale-client");



// Map CodeWhale thread summary to dashboard session format

function threadToSession(t) {

  return {

    id: t.id,

    title: t.title || t.preview || "Chat",

    description: t.preview || "",

    created_at: t.created_at,

    updated_at: t.updated_at,

    model: t.model || "deepseek-v4-pro",

    mode: t.mode || "Agent",

    pinned: t.pinned || false,

    archived: t.archived || false,

    latest_turn_status: t.latest_turn_status,

    thread_id: t.id,

  };

}



// GET /api/sessions - List all threads from CodeWhale

router.get("/", async (req, res) => {

  try {

    const { search, include_archived, archived_only, limit } = req.query;

    const result = await cw.getThreadSummary({

      limit: limit ? parseInt(limit) : 50,

      search: search || undefined,

      include_archived: include_archived === "true",

      archived_only: archived_only === "true",

    });

    const sessions = (Array.isArray(result) ? result : (result.threads || result.data || [])).map(threadToSession).filter(s => s.model !== "deepseek-v4-flash" && s.model !== "flash" && !s.title.includes("你是会话管家") && !s.title.includes("基于以下会话") && !s.title.includes("用一句话"));

    res.json({ success: true, data: sessions });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// GET /api/sessions/:id - Get thread detail

router.get("/:id", async (req, res) => {

  try {

    const thread = await cw.getThread(req.params.id);

    const t = thread.thread || thread;

    res.json({ success: true, data: threadToSession(t) });

  } catch (err) {

    res.status(404).json({ success: false, error: "Session not found" });

  }

});



// POST /api/sessions - Create a new thread

router.post("/", async (req, res) => {

  try {

    const { title, model, mode, workspace } = req.body;

    const thread = await cw.createThread({

      model: model || "deepseek-v4-pro",

      mode: mode || "Agent",

      auto_approve: true,

      workspace: workspace || undefined,

    });

    const id = thread.id || thread.thread?.id;

    if (title && title !== "New Chat") {

      try { await cw.patchThread(id, { title }); } catch {}

    }

    res.json({ success: true, data: { id, title: title || "New Chat", model: model || "deepseek-v4-pro" } });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// PATCH /api/sessions/:id - Update thread (title, etc.)

router.patch("/:id", async (req, res) => {

  try {

    await cw.patchThread(req.params.id, req.body);

    res.json({ success: true });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// DELETE /api/sessions/:id - Delete thread

router.delete("/:id", async (req, res) => {

  try {

    await cw.deleteThread(req.params.id);

    res.json({ success: true });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// POST /api/sessions/:id/pin - Toggle pin (archive/unarchive)

router.post("/:id/pin", async (req, res) => {

  try {

    const thread = await cw.getThread(req.params.id);

    const t = thread.thread || thread;

    const archived = !t.archived;

    await cw.patchThread(req.params.id, { archived });

    res.json({ success: true, data: { pinned: !archived } });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// GET /api/sessions/:id/messages - Get thread items as messages

router.get("/:id/messages", async (req, res) => {

  try {

    const thread = await cw.getThread(req.params.id);

    const items = thread.items || [];

    

    // Find reasoning items to attach to agent messages

    const reasoningMap = new Map();

    for (const item of items) {

      if (item.kind === "reasoning" && item.detail) {

        // Find the next agent_message and attach reasoning to it

        const agentMsg = items.find(i => i.kind === "agent_message" && 

          new Date(i.started_at || 0) >= new Date(item.started_at || 0));

        if (agentMsg) reasoningMap.set(agentMsg.id, item.detail);

      }

    }

    

    const messages = items

      .filter(item => item.kind === "user_message" || item.kind === "agent_message")

      .map(item => {

        const ts = item.started_at || item.ended_at || item.created_at || new Date().toISOString();

        return {

          id: item.id,

          session_id: req.params.id,

          role: item.kind === "user_message" ? "user" : "assistant",

          content: item.detail || item.summary || "",

          timestamp: ts,

          created_at: ts,

          reasoning: reasoningMap.get(item.id) || undefined,

          token_count: item.usage?.total_tokens || 0,

          status: item.status,

        };

      });

    res.json({ success: true, data: messages });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// POST /api/sessions/:id/compact - Compact thread context

router.post("/:id/compact", async (req, res) => {

  try {

    await cw.compactThread(req.params.id);

    res.json({ success: true, message: "Thread compacted" });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// POST /api/sessions/:id/archive - Archive thread

router.post("/:id/archive", async (req, res) => {

  try {

    await cw.patchThread(req.params.id, { archived: true });

    res.json({ success: true, message: "Thread archived" });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});



// POST /api/sessions/:id/unarchive - Unarchive thread

router.post("/:id/unarchive", async (req, res) => {

  try {

    await cw.patchThread(req.params.id, { archived: false });

    res.json({ success: true, message: "Thread unarchived" });

  } catch (err) {

    res.status(500).json({ success: false, error: typeof err === 'string' ? err : (err.message || JSON.stringify(err).slice(0, 200)) });

  }

});


// ---- AI Session Management ----

// Build metadata-only session list for AI context (lightweight, ~1K tokens)
async function buildSessionMetadata() {
  const result = await cw.getThreadSummary({ limit: 200, include_archived: true });
  const threads = Array.isArray(result) ? result : (result.threads || result.data || []);
  return threads.filter(t => !t.archived && !(t.title||"").includes("\u4f60\u662f\u4f1a\u8bdd\u7ba1\u5bb6") && !(t.title||"").includes("\u57fa\u4e8e\u4ee5\u4e0b\u4f1a\u8bdd") && !(t.title||"").includes("\u7528\u4e00\u53e5\u8bdd")).map(t => ({
    id: t.id,
    title: (t.title || t.preview || "Chat").slice(0, 80),
    model: (t.model || "unknown").split("-").pop(),
    mode: t.mode || "Agent",
    date: (t.updated_at || t.created_at || "").slice(0, 10),
    archived: !!t.archived,
  }));
}

// Run an AI query in a disposable thread (auto-cleaned after use)
async function runAiQuery(prompt, pollMs = 15000) {
  const t = await cw.createThread({ model: "deepseek-v4-flash", mode: "Agent", auto_approve: true });
  const tid = t.id || t.thread?.id;
  await cw.sendMessage(tid, prompt, { auto_approve: true });
  
  let result = "";
  const steps = Math.ceil(pollMs / 1000);
  for (let i = 0; i < steps; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const ut = await cw.getThread(tid);
      const msgs = (ut.items || []).filter(it => it.kind === "agent_message");
      if (msgs.length > 0) {
        const lm = msgs[msgs.length - 1];
        if (lm.detail && lm.detail.length > 3) { result = lm.detail; break; }
      }
    } catch { break; }
  }
  
  // Set identifying title for filtering
  try { await cw.patchThread(tid, { archived: true }); console.log("[AI] Archived disposable thread " + tid); } catch(e) { console.warn("[AI] Failed to archive thread " + tid + ": " + e.message); }
  
  return result;
}

// POST /api/sessions/ai/chat - Stream AI chat about sessions
router.post("/ai/chat", async (req, res) => {
  try {
    const { query, mode, sessionId } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "query required" });

    let prompt;
    if (mode === "deep" && sessionId) {
      const thread = await cw.getThread(sessionId);
      const items = (thread.items || []).filter(i => i.kind === "user_message" || i.kind === "agent_message").slice(0, 5);
      const messages = items.map(i => "[" + (i.kind==="user_message"?"\u7528\u6237":"\u52a9\u624b") + "]: " + (i.detail||i.summary||"").slice(0, 200)).join("\n");
      prompt = "\u4f60\u662f\u4f1a\u8bdd\u7ba1\u5bb6\u3002\u4ee5\u4e0b\u662f\u4e00\u6bb5 CodeWhale \u4f1a\u8bdd\u7684\u6d88\u606f\u8bb0\u5f55\u3002\n\n" + messages + "\n\n\u7528\u6237\u95ee\u9898\uff1a" + query + "\n\n\u8bf7\u7528\u7b80\u6d01\u7684\u4e2d\u6587\u56de\u7b54\uff0c\u76f4\u63a5\u7ed9\u7b54\u6848\u3002";
    } else {
      const meta = await buildSessionMetadata();
      prompt = "\u4f60\u662f\u4f1a\u8bdd\u7ba1\u5bb6\u3002\u4ee5\u4e0b\u662f\u7528\u6237\u5f53\u524d\u7684 CodeWhale \u4f1a\u8bdd\u5217\u8868\u5171 " + meta.length + " \u4e2a\u4f1a\u8bdd\u3002" + "\n" + JSON.stringify(meta) + "\n\n\u89c4\u5219\n- \u4ec5\u6839\u636e\u4f1a\u8bdd\u5143\u6570\u636e\u56de\u7b54\n- \u63a8\u8350\u4f1a\u8bdd\u65f6\u7528\u683c\u5f0f [id] title\n- \u8bf7\u7528\u7b80\u6d01\u7684\u4e2d\u6587\uff0c\u76f4\u63a5\u56de\u7b54";
    }

    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
    let closed = false;
    req.on("close", () => { closed = true; });

    const result = await runAiQuery(prompt, 20000);
    if (!closed && !res.writableEnded) {
      res.write("data: " + JSON.stringify({ text: result || "\u65e0\u6cd5\u751f\u6210\u56de\u590d" }) + "\n\n");
      res.write("data: " + JSON.stringify({ done: true }) + "\n\n");
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

// POST /api/sessions/ai/title/:id - Suggest titles
router.post("/ai/title/:id", async (req, res) => {
  try {
    const thread = await cw.getThread(req.params.id);
    const items = (thread.items || []).filter(i => i.kind === "user_message" || i.kind === "agent_message").slice(0, 5);
    if (items.length === 0) return res.json({ success: true, data: { titles: [] } });

    const messages = items.map(i => "[" + (i.kind==="user_message"?"\u7528\u6237":"\u52a9\u624b") + "]: " + (i.detail||i.summary||"").slice(0, 200)).join("\n");
    const prompt = "\u57fa\u4e8e\u4ee5\u4e0b\u4f1a\u8bdd\u5185\u5bb9\uff0c\u751f\u6210 3 \u4e2a\u7b80\u6d01\u7684\u4e2d\u6587\u6807\u9898\uff08\u6bcf\u4e2a\u6807\u9898\u4e0d\u8d85\u8fc730\u5b57\uff09\u3002\u53ea\u8fd4\u56de JSON \u6570\u7ec4\uff1a[\"\u6807\u98981\",\"\u6807\u98982\",\"\u6807\u98983\"]\n\n" + messages;
    
    const result = await runAiQuery(prompt, 15000);
    let titles = [];
    if (result) {
      try { const m = result.match(/\[[\s\S]*?\]/); if (m) titles = JSON.parse(m[0]); } catch {
        titles = result.split(/[\n,\uff0c\u3002]/).map(s => s.replace(/^\d+[\.\)\u3001\uff0c]\s*/, "").trim()).filter(s => s.length > 2 && s.length < 60).slice(0, 3);
        if (!titles.length) titles = [result.slice(0, 60)];
      }
    }
    res.json({ success: true, data: { titles: titles.slice(0, 3) } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

// POST /api/sessions/ai/summarize/:id - Summarize
router.post("/ai/summarize/:id", async (req, res) => {
  try {
    const thread = await cw.getThread(req.params.id);
    const items = (thread.items || []).filter(i => i.kind === "user_message" || i.kind === "agent_message").slice(0, 10);
    if (items.length === 0) return res.json({ success: true, data: { summary: "\u7a7a\u4f1a\u8bdd" } });

    const messages = items.map(i => "[" + (i.kind==="user_message"?"\u7528\u6237":"\u52a9\u624b") + "]: " + (i.detail||i.summary||"").slice(0, 200)).join("\n");
    const prompt = "\u7528\u4e00\u53e5\u8bdd\uff08\u4e0d\u8d85\u8fc750\u5b57\uff09\u603b\u7ed3\u4ee5\u4e0b\u4f1a\u8bdd\u7684\u5185\u5bb9\u3002\u53ea\u8fd4\u56de\u603b\u7ed3\u6587\u672c\u3002\n\n" + messages;
    
    const result = await runAiQuery(prompt, 15000);
    res.json({ success: true, data: { summary: (result || "\u65e0\u6cd5\u751f\u6210\u6458\u8981").slice(0, 200) } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

// POST /api/sessions/ai/recommend - Batch recommendations
router.post("/ai/recommend", async (req, res) => {
  try {
    const meta = await buildSessionMetadata();
    const prompt = "\u4f60\u662f\u4f1a\u8bdd\u7ba1\u5bb6\u3002\u4ee5\u4e0b\u662f\u6700\u65b0\u7684 CodeWhale \u4f1a\u8bdd\u5217\u8868\u5171 " + meta.length + " \u4e2a\u4f1a\u8bdd\u3002\n" + JSON.stringify(meta) + "\n\n\u8bf7\u63a8\u8350\u4ee5\u4e0b JSON\uff1a\n{\n  \"toArchive\": [\"id1\",\"id2\"],\n  \"toCleanup\": [\"id3\"],\n  \"duplicates\": [[\"id4\",\"id5\"]]\n}\n\n\u53ea\u8fd4\u56de JSON\u3002";
    
    const result = await runAiQuery(prompt, 25000);
    let recommendations = { toArchive: [], toCleanup: [], duplicates: [] };
    if (result) {
      try { const m = result.match(/\{[\s\S]*\}/); if (m) recommendations = JSON.parse(m[0]); } catch {}
    }
    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});


// POST /api/sessions/:id/resume - Resume an interrupted session
router.post("/:id/resume", async (req, res) => {
  try {
    const result = await cw.resumeThread(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

module.exports = router;
