const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// GET /api/tasks - List all tasks
router.get("/", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const result = await cw.listTasks(limit);
    res.json({ success: true, data: result.tasks || [], counts: result.counts || {} });
  } catch (err) {
    res.json({ success: true, data: [], counts: {} });
  }
});

// POST /api/tasks - Create a new task
router.post("/", async (req, res) => {
  try {
    const task = await cw.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

// GET /api/tasks/:id - Get task detail
router.get("/:id", async (req, res) => {
  try {
    const task = await cw.getTask(req.params.id);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(404).json({ success: false, error: "Task not found" });
  }
});

// POST /api/tasks/:id/cancel - Cancel a task
router.post("/:id/cancel", async (req, res) => {
  try {
    await cw.cancelTask(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err.message || String(err)).slice(0, 200) });
  }
});

module.exports = router;