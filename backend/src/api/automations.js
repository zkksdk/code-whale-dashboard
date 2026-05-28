const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/automations
router.get("/", async (req, res) => {
  try { const data = await cw.listAutomations(); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/automations/:id
router.get("/:id", async (req, res) => {
  try { const data = await cw.getAutomation(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(err.message.includes("not found") ? 404 : 500).json({ success: false, error: err.message }); }
});

// POST /api/automations
router.post("/", async (req, res) => {
  try { const data = await cw.createAutomation(req.body); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/automations/:id
router.patch("/:id", async (req, res) => {
  try { const data = await cw.updateAutomation(req.params.id, req.body); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/automations/:id
router.delete("/:id", async (req, res) => {
  try { await cw.deleteAutomation(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/automations/:id/run
router.post("/:id/run", async (req, res) => {
  try { const data = await cw.runAutomation(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/automations/:id/pause
router.post("/:id/pause", async (req, res) => {
  try { const data = await cw.pauseAutomation(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/automations/:id/resume
router.post("/:id/resume", async (req, res) => {
  try { const data = await cw.resumeAutomation(req.params.id); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/automations/:id/runs
router.get("/:id/runs", async (req, res) => {
  try { const data = await cw.listAutomationRuns(req.params.id, req.query.limit); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
