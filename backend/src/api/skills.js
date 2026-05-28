const express = require("express");
const router = express.Router();
const fs = require("fs");
const cw = require("../services/codewhale-client");
const sm = require("../services/skills-manager");
const { execSync } = require("child_process");

// GET /api/skills - List all skills (from CodeWhale + local details)
router.get("/", async (req, res) => {
  try {
    let cwSkills = { directory: sm.SKILLS_DIR, warnings: [], skills: [] };
    try {
      const result = await cw.getSkills();
      if (result && result.skills) cwSkills.skills = result.skills;
      if (result && result.directory) cwSkills.directory = result.directory;
      if (result && result.warnings) cwSkills.warnings = result.warnings;
    } catch {}

    const localSkills = sm.listAllSkills();

    let caps = {};
    try {
      const json = execSync("codewhale doctor --json", {
        encoding: "utf-8", timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"]
      });
      caps = JSON.parse(json);
    } catch {}

    const mergedSkills = cwSkills.skills.map(s => {
      const local = localSkills.find(l => l.name === s.name);
      return local ? { ...s, ...local } : s;
    });

    const cwNames = new Set(cwSkills.skills.map(s => s.name));
    for (const s of localSkills) {
      if (!cwNames.has(s.name)) {
        mergedSkills.push({ ...s, enabled: s.enabled !== false });
      }
    }


    // Override plugins/tools with actual filesystem check
    if (caps.plugins && caps.plugins.path) {
      try {
        const pluginPath = caps.plugins.path;
        if (fs.existsSync(pluginPath)) {
          const entries = fs.readdirSync(pluginPath, { withFileTypes: true }).filter(e => e.isDirectory());
          caps.plugins.present = true;
          caps.plugins.count = entries.length;
        }
      } catch {}
    }
    if (caps.tools && caps.tools.path) {
      try {
        const toolPath = caps.tools.path;
        if (fs.existsSync(toolPath)) {
          const entries = fs.readdirSync(toolPath);
          caps.tools.present = true;
          caps.tools.count = entries.length;
        }
      } catch {}
    }

    res.json({
      success: true,
      data: {
        directory: cwSkills.directory || sm.SKILLS_DIR,
        skills: mergedSkills,
        warnings: cwSkills.warnings || [],
        total: mergedSkills.length,
        enabledCount: mergedSkills.filter(s => s.enabled !== false).length,
        disabledCount: mergedSkills.filter(s => s.enabled === false).length,
        directories: caps.skills || {},
        plugins: caps.plugins || {},
        tools: caps.tools || {},
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/skills/curated - List curated installable skills
router.get("/curated", (req, res) => {
  try {
    const curated = sm.getCuratedSkills();
    res.json({ success: true, data: curated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/skills/:name - Get skill details (SKILL.md content)
router.get("/:name", (req, res) => {
  try {
    const detail = sm.getSkillDetail(req.params.name);
    if (!detail) {
      return res.status(404).json({ success: false, error: "Skill not found" });
    }
    res.json({ success: true, data: detail });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/skills/install - Install skill from GitHub
router.post("/install", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ success: false, error: "repoUrl is required" });
    }
    const result = await sm.installSkill(repoUrl);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(422).json({ success: false, error: err.message });
  }
});

// DELETE /api/skills/:name - Uninstall skill
router.delete("/:name", (req, res) => {
  try {
    const result = sm.uninstallSkill(req.params.name);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(422).json({ success: false, error: err.message });
  }
});

// PATCH /api/skills/:name/toggle - Toggle via CodeWhale API
router.patch("/:name/toggle", async (req, res) => {
  try {
    // First get current state
    const skills = await cw.getSkills();
    const skill = (skills.skills || []).find((s) => s.name === req.params.name);
    const newEnabled = skill ? !skill.enabled : true;
    // POST /v1/skills/{name} { enabled: bool }
    try {
      await cw.setSkillEnabled(req.params.name, newEnabled);
    } catch {
      // Fallback to local toggle
      sm.toggleSkill(req.params.name);
    }
    res.json({ success: true, data: { name: req.params.name, enabled: newEnabled } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
