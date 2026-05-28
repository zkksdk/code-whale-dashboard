const express = require("express");
const router = express.Router();
const cw = require("../services/codewhale-client");
const { execSync } = require("child_process");

// GET /api/mcp/servers
router.get("/servers", async (req, res) => {
  try {
    const servers = await cw.listMcpServers();
    res.json({ success: true, data: servers });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// POST /api/mcp/reload
router.post("/reload", async (req, res) => {
  try {
    const result = await cw.reloadMcp();
    res.json({ success: true, data: result });
  } catch (err) {
    // CodeWhale may not support reload (404) - treat as non-critical
    res.json({ success: true, data: { message: "Reload attempted", note: err.message } });
  }
});

// GET /api/mcp/capabilities - from codewhale doctor --json
router.get("/capabilities", async (req, res) => {
  try {
    const json = execSync("codewhale doctor --json", {
      encoding: "utf-8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"]
    });
    const caps = JSON.parse(json);
    res.json({ success: true, data: caps });
  } catch (err) {
    res.json({ success: true, data: {} });
  }
});

module.exports = router;
