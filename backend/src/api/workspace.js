const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const os = require("os");
const cw = require("../services/codewhale-client");

// GET /api/workspace
router.get("/", async (req, res) => {
  try { const data = await cw.getWorkspaceStatus(); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/workspace/workspaces - List available workspaces
router.get("/workspaces", async (req, res) => {
  try {
    const result = [];
    // 1. Current workspace from CodeWhale
    try {
      const ws = await cw.getWorkspaceStatus();
      if (ws.workspace) result.push({ path: ws.workspace, label: path.basename(ws.workspace), source: "current", branch: ws.branch });
    } catch {}
    
    // 2. Projects from config.toml (trusted directories)
    try {
      const TOML = require("@iarna/toml");
      const configPath = path.join(os.homedir(), ".deepseek", "config.toml");
      if (fs.existsSync(configPath)) {
        const config = TOML.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.projects) {
          for (const [projPath, projConfig] of Object.entries(config.projects)) {
            const cleanPath = projPath.replace(/^\\\\\?\\/, "").replace(/^\\\\\\\\\?\\\\/, "");
            if (cleanPath !== result[0]?.path && fs.existsSync(cleanPath)) {
              result.push({ path: cleanPath, label: path.basename(cleanPath), source: "config", trust: projConfig.trust_level });
            }
          }
        }
      }
    } catch {}
    
    // 3. Common project roots
    const homeRoots = [
      path.join(os.homedir(), "Desktop"),
      path.join(os.homedir(), "Documents"),
    ];
    for (const root of homeRoots) {
      if (!fs.existsSync(root)) continue;
      try {
        const entries = fs.readdirSync(root);
        for (const entry of entries.slice(0, 8)) {
          const full = path.join(root, entry);
          if (!fs.statSync(full).isDirectory()) continue;
          if (full === result[0]?.path) continue;
          if (!result.find(r => r.path === full)) {
            result.push({ path: full, label: entry, source: "home" });
          }
        }
      } catch {}
    }
    
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspace/create - Create a new workspace directory
router.post("/create", async (req, res) => {
  try {
    const { parentPath, name } = req.body;
    if (!parentPath || !name) return res.status(400).json({ success: false, error: "parentPath and name required" });
    const fullPath = path.join(parentPath, name);
    if (fs.existsSync(fullPath)) return res.json({ success: true, data: { path: fullPath, existed: true } });
    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ success: true, data: { path: fullPath, existed: false } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workspace/browse - Browse directories
router.get("/browse", async (req, res) => {
  try {
    const dirPath = req.query.path || os.homedir();
    if (!fs.existsSync(dirPath)) return res.status(404).json({ success: false, error: "Directory not found" });
    const entries = fs.readdirSync(dirPath)
      .filter(name => !name.startsWith(".") || name === ".deepseek")
      .map(name => {
        const full = path.join(dirPath, name);
        try {
          const stat = fs.statSync(full);
          return { name, path: full, isDir: stat.isDirectory() };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
    
    res.json({ success: true, data: { path: dirPath, parent: path.dirname(dirPath), entries } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
