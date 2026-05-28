const express = require("express");
const router = express.Router();
const { execSync } = require("child_process");
const cw = require("../services/codewhale-client");

// GET /api/system - Full system diagnostic
router.get("/", async (req, res) => {
  try {
    let doctor = {};
    try {
      const json = execSync("codewhale-tui doctor --json", {
        encoding: "utf-8", timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      doctor = JSON.parse(json);
    } catch (e) { doctor = { error: e.message }; }

    let features = [];
    try {
      const out = execSync("codewhale-tui features list", {
        encoding: "utf-8", timeout: 3000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      features = out.trim().split("\n").slice(1).map(line => {
        const parts = line.trim().split(/\s+/);
        return { name: parts[0], stage: parts[1], enabled: parts[2] === "true" };
      });
    } catch {}

    let models = [];
    try {
      const out = execSync("codewhale-tui models", {
        encoding: "utf-8", timeout: 3000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      models = out.trim().split("\n").slice(1).map(line => {
        const m = line.match(/[\*\s]*(.+?)\s+\((.+?)\)/);
        return m ? { name: m[1], provider: m[2], is_default: line.includes("*") } : null;
      }).filter(Boolean);
    } catch {}

    let skills = [];
    try { skills = await cw.getSkills(); skills = skills.skills || skills || []; } catch {}

    let automationCount = 0;
    try { const a = await cw.listAutomations(); automationCount = (a.automations || a || []).length; } catch {}

    let workspace = {};
    try { workspace = await cw.getWorkspaceStatus(); } catch {}

    res.json({
      success: true,
      data: { doctor, features, models, skills, automationCount, workspace }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/system/features
router.get("/features", (req, res) => {
  try {
    const out = execSync("codewhale-tui features list", {
      encoding: "utf-8", timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const features = out.trim().split("\n").slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      return { name: parts[0], stage: parts[1], enabled: parts[2] === "true" };
    });
    res.json({ success: true, data: features });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/system/doctor
router.get("/doctor", (req, res) => {
  try {
    const json = execSync("codewhale-tui doctor --json", {
      encoding: "utf-8", timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"]
    });
    res.json({ success: true, data: JSON.parse(json) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;