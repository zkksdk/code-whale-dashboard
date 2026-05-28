const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/threads
router.get("/", async (req, res) => {
  try { const data = await cw.getThreadSummary(req.query); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/threads/:id
router.get("/:id", async (req, res) => {
  try { const data = await cw.getThread(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/threads/:id
router.patch("/:id", async (req, res) => {
  try { const data = await cw.patchThread(req.params.id, req.body); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/threads/:id
router.delete("/:id", async (req, res) => {
  try { await cw.deleteThread(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/threads/:id/fork
router.post("/:id/fork", async (req, res) => {
  try { const data = await cw.forkThread(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/threads/:id/resume
router.post("/:id/resume", async (req, res) => {
  try { const data = await cw.resumeThread(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/threads/:id/turns/:turnId/steer
router.post("/:id/turns/:turnId/steer", async (req, res) => {
  try { const data = await cw.steerTurn(req.params.id, req.params.turnId, req.body.steer); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/threads/:id/turns/:turnId/interrupt
router.post("/:id/turns/:turnId/interrupt", async (req, res) => {
  try { const data = await cw.interruptTurn(req.params.id, req.params.turnId); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/threads/:id/compact
router.post("/:id/compact", async (req, res) => {
  try { const data = await cw.compactThread(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
