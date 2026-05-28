const express = require("express");
const router = express.Router();
const fs = require("fs");
const os = require("os");
const path = require("path");
const TOML = require("@iarna/toml");
const { execSync } = require("child_process");

const CONFIG_PATH = path.join(os.homedir(), ".deepseek", "config.toml");

function getConfigPath() {
  try {
    const json = execSync("codewhale doctor --json", {
      encoding: "utf-8", timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const doctor = JSON.parse(json);
    return doctor.config_path || CONFIG_PATH;
  } catch {
    return CONFIG_PATH;
  }
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return { _path: configPath, _exists: false };
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = TOML.parse(content);
    parsed._path = configPath;
    parsed._exists = true;
    parsed._raw = content;
    return parsed;
  } catch (err) {
    return { _path: configPath, _exists: true, _error: err.message };
  }
}

function saveConfig(updates) {
  const configPath = getConfigPath();
  // Read existing config
  let current = {};
  if (fs.existsSync(configPath)) {
    try {
      current = TOML.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {}
  }

  // Deep merge updates into current
  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object") {
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  deepMerge(current, updates);

  // Remove metadata keys before saving
  delete current._path;
  delete current._exists;
  delete current._error;
  delete current._raw;

  // Write
  const tomlContent = TOML.stringify(current);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, tomlContent, "utf-8");
  return { success: true, path: configPath };
}

// GET /api/config - Read config.toml
router.get("/", (req, res) => {
  try {
    const config = loadConfig();
    res.json({ success: true, data: config, configPath: config._path, exists: config._exists || false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/config - Update config.toml
router.put("/", (req, res) => {
  try {
    const result = saveConfig(req.body);
    res.json({ success: true, data: result, message: "Config updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/config/reload - Reload config
router.post("/reload", (req, res) => {
  try {
    const config = loadConfig();
    if (!config._exists) return res.status(404).json({ success: false, error: "Config not found" });
    res.json({ success: true, message: "Config re-read from disk", configPath: config._path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/config/test - Test CodeWhale connection
router.post("/test", async (req, res) => {
  try {
    const cw = require("../services/codewhale-client");
    await cw.healthCheck();
    res.json({ success: true, message: "CodeWhale connection OK" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
