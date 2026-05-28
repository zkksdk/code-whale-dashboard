const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");
const { execSync } = require("child_process");

// GET /api/models - Get models from codewhale doctor --json
router.get("/", async (req, res) => {
  try {
    // Try codewhale doctor --json for capabilities
    let caps = {};
    try {
      const json = execSync("codewhale doctor --json", { encoding: "utf-8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
      caps = JSON.parse(json);
    } catch {}

    const model = caps.default_text_model || "deepseek-chat";
    const baseUrl = caps.base_url || "https://api.deepseek.com/beta";
    const provider = caps.api_key?.source || "unknown";

    res.json({
      success: true,
      data: [
        { id: model, name: model, provider: "deepseek", is_default: true, base_url: baseUrl },
      ],
      capabilities: caps,
    });
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
