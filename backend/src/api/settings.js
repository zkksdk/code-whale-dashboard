const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(require("os").homedir(), ".code-whale-dashboard", "settings.json");

const DEFAULT_SETTINGS = { theme: "dark", language: "zh", autoSave: true };

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(data) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/settings
router.get("/", (req, res) => {
  try {
    const settings = readSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings
router.put("/", (req, res) => {
  try {
    const current = readSettings();
    const merged = { ...current, ...req.body };
    writeSettings(merged);
    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings/:key
router.get("/:key", (req, res) => {
  try {
    const settings = readSettings();
    if (settings[req.params.key] === undefined) {
      return res.status(404).json({ success: false, error: "Setting not found" });
    }
    res.json({ success: true, data: { key: req.params.key, value: settings[req.params.key] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;