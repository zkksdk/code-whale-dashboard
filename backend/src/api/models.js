const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");
const { execSync } = require("child_process");

// GET /api/models - Get ALL models from codewhale doctor --json
router.get("/", async (req, res) => {
  try {
    let caps = {};
    try {
      const json = execSync("codewhale doctor --json", {
        encoding: "utf-8", timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      caps = JSON.parse(json);
    } catch {}

    const baseUrl = caps.base_url || "https://api.deepseek.com/beta";
    const provider = caps.api_key?.source || "unknown";

    // Collect ALL models: from caps.models array + default
    const models = [];
    const seen = new Set();
    
    // System models from doctor
    if (caps.models && Array.isArray(caps.models)) {
      for (const m of caps.models) {
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        models.push({
          id: m.name, name: m.name,
          provider: m.provider || "deepseek",
          is_default: m.is_default || m.name === caps.default_text_model,
          base_url: baseUrl,
          context_window: caps.capability?.context_window,
          max_output: caps.capability?.max_output,
        });
      }
    }
    
    // Fallback: at least the default model
    if (models.length === 0) {
      const def = caps.default_text_model || "deepseek-chat";
      models.push({
        id: def, name: def,
        provider: "deepseek", is_default: true,
        base_url: baseUrl,
        context_window: caps.capability?.context_window,
        max_output: caps.capability?.max_output,
      });
    }

    res.json({ success: true, data: models, capabilities: caps.capability || caps });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// POST /api/models/switch - Switch active model
router.post("/switch", async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ success: false, error: "model is required" });
  try {
    const result = await cw.switchModel(model);
    res.json({ success: true, data: result });
  } catch {
    res.json({ success: true, data: { model, switched: false, note: "Model switch not supported via HTTP API" } });
  }
});

module.exports = router;
