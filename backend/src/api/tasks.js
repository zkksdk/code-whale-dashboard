const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");

// Map CodeWhale automation to dashboard task format
function automationToTask(a) {
  return {
    id: a.id,
    title: a.title || a.name || "Untitled",
    description: a.description || "",
    prompt: a.prompt || "",
    type: a.cron_expression ? "cron" : "one_time",
    cron_expression: a.cron_expression || null,
    status: a.paused ? "paused" : (a.status || "active"),
    last_run: a.last_run_at || null,
    next_run: a.next_run_at || null,
    created_at: a.created_at,
    updated_at: a.updated_at,
    run_count: a.run_count || 0,
    error_count: a.error_count || 0,
  };
}

// GET /api/tasks - List all automations from CodeWhale
router.get("/", async (req, res) => {
  try {
    const result = await cw.listAutomations();
    const automations = result.automations || result.data || result || [];
    const tasks = (Array.isArray(automations) ? automations : []).map(automationToTask);
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const a = await cw.getAutomation(req.params.id);
    const runs = await cw.listAutomationRuns(req.params.id).catch(() => []);
    const task = automationToTask(a);
    const runList = (runs.runs || runs.data || runs || []).map(r => ({
      id: r.id,
      task_id: req.params.id,
      status: r.status,
      output: r.output || r.summary || "",
      error: r.error || "",
      started_at: r.started_at || r.created_at,
      completed_at: r.completed_at || r.ended_at,
      token_used: r.token_usage || 0,
    }));
    res.json({ success: true, data: { ...task, runs: runList } });
  } catch (err) {
    res.status(404).json({ success: false, error: "Task not found" });
  }
});

// POST /api/tasks - Create automation
router.post("/", async (req, res) => {
  try {
    const { title, description, prompt, type, cron_expression } = req.body;
    const a = await cw.createAutomation({
      title: title || "New Task",
      description: description || "",
      prompt: prompt || "",
      cron_expression: type === "cron" ? cron_expression : undefined,
    });
    const task = automationToTask(a.automation || a);
    res.json({ success: true, data: task, message: "Task created" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tasks/:id - Update automation
router.put("/:id", async (req, res) => {
  try {
    const { title, description, prompt, type, cron_expression, status } = req.body;
    await cw.updateAutomation(req.params.id, {
      title,
      description,
      prompt,
      cron_expression: type === "cron" ? cron_expression : undefined,
      paused: status === "paused",
    });
    const a = await cw.getAutomation(req.params.id);
    res.json({ success: true, data: automationToTask(a), message: "Task updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id - Delete automation
router.delete("/:id", async (req, res) => {
  try {
    await cw.deleteAutomation(req.params.id);
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/run - Run automation now
router.post("/:id/run", async (req, res) => {
  try {
    const result = await cw.runAutomation(req.params.id);
    res.json({ success: true, data: result, message: "Task executed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/:id/runs - Get run history
router.get("/:id/runs", async (req, res) => {
  try {
    const runs = await cw.listAutomationRuns(req.params.id);
    const runList = (runs.runs || runs.data || runs || []).map(r => ({
      id: r.id,
      task_id: req.params.id,
      status: r.status,
      output: r.output || r.summary || "",
      error: r.error || "",
      started_at: r.started_at || r.created_at,
      completed_at: r.completed_at || r.ended_at,
    }));
    res.json({ success: true, data: runList });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;