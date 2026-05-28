const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawn } = require("child_process");

const SKILLS_DIR = path.join(os.homedir(), ".deepseek", "skills");
const STATE_FILE = path.join(os.homedir(), ".deepseek", "skills-state.json");

function _readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function _writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function isEnabled(name) {
  const state = _readState();
  return state[name] !== false;
}

function toggleSkill(name) {
  const state = _readState();
  const current = state[name] !== false;
  state[name] = !current;
  _writeState(state);
  return { name, enabled: state[name], previous: current };
}

function listAllSkills() {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    const state = _readState();
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const skillDir = path.join(SKILLS_DIR, d.name);
        const mdPath = path.join(skillDir, "SKILL.md");
        const descPath = path.join(skillDir, "README.md");
        const info = {
          name: d.name,
          path: skillDir,
          enabled: state[d.name] !== false,
          description: "",
          hasSkillMd: fs.existsSync(mdPath),
          hasReadme: fs.existsSync(descPath),
        };
        if (info.hasSkillMd) {
          try {
            const content = fs.readFileSync(mdPath, "utf-8");
            const lines = content.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && trimmed.length > 10) {
                info.description = trimmed.substring(0, 120);
                break;
              }
            }
          } catch {}
        }
        return info;
      });
    return dirs;
  } catch (err) {
    console.error("listAllSkills error:", err.message);
    return [];
  }
}

function getSkillDetail(name) {
  const skillDir = path.join(SKILLS_DIR, name);
  if (!fs.existsSync(skillDir)) return null;
  const state = _readState();
  const mdPath = path.join(skillDir, "SKILL.md");
  const readmePath = path.join(skillDir, "README.md");
  const detail = {
    name,
    path: skillDir,
    enabled: state[name] !== false,
    description: "",
    skillMd: null,
    readme: null,
    files: [],
  };
  try {
    if (fs.existsSync(mdPath)) {
      detail.skillMd = fs.readFileSync(mdPath, "utf-8");
    }
    if (fs.existsSync(readmePath)) {
      detail.readme = fs.readFileSync(readmePath, "utf-8");
    }
    detail.files = fs.readdirSync(skillDir).map(f => ({
      name: f,
      isDir: fs.statSync(path.join(skillDir, f)).isDirectory(),
    }));
  } catch (err) {
    console.error("getSkillDetail error:", err.message);
  }
  return detail;
}

const CURATED_FALLBACK = [
  { name: "imagegen", description: "Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or tra", repo: "https://github.com/openai/skills", subpath: "skills/.curated/imagegen" },
  { name: "openai-docs", description: "Use when the user asks how to build with OpenAI products or APIs and needs up-to-date official documentation with citations, help choosing the latest mo", repo: "https://github.com/openai/skills", subpath: "skills/.curated/openai-docs" },
  { name: "plugin-creator", description: "Create and scaffold plugin directories for Codex with a required .codex-plugin/plugin.json, optional plugin folders/files, valid manifest defaults,", repo: "https://github.com/openai/skills", subpath: "skills/.curated/plugin-creator" },
  { name: "skill-creator", description: "Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex''s", repo: "https://github.com/openai/skills", subpath: "skills/.curated/skill-creator" },
  { name: "skill-installer", description: "Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curat", repo: "https://github.com/openai/skills", subpath: "skills/.curated/skill-installer" },
  { name: "aspnet-core", description: "Build, review, refactor, or architect ASP.NET Core web applications using current official guidance for .NET web development. Use when working on Blazor", repo: "https://github.com/openai/skills", subpath: "skills/.curated/aspnet-core" },
  { name: "browser-use", description: "Browser automation for the Codex in-app browser. Use to open, navigate, inspect, test, click, type, screenshot, or verify local targets such as localhos", repo: "https://github.com/openai/skills", subpath: "skills/.curated/browser-use" },
  { name: "chatgpt-apps", description: "Build, scaffold, refactor, and troubleshoot ChatGPT Apps SDK applications that combine an MCP server and widget UI. Use when Codex needs to design too", repo: "https://github.com/openai/skills", subpath: "skills/.curated/chatgpt-apps" },
  { name: "cli-creator", description: "Build a composable CLI for Codex from API docs, an OpenAPI spec, existing curl examples, an SDK, a web app, an admin tool, or a local script. Use when t", repo: "https://github.com/openai/skills", subpath: "skills/.curated/cli-creator" },
  { name: "cloudflare-deploy", description: "Deploy applications and infrastructure to Cloudflare using Workers, Pages, and related platform services. Use when the user asks to deploy, host, publis", repo: "https://github.com/openai/skills", subpath: "skills/.curated/cloudflare-deploy" },
  { name: "figma", description: "Use the Figma MCP server to fetch design context, screenshots, variables, and assets from Figma, and to translate Figma nodes into production code. Trig", repo: "https://github.com/openai/skills", subpath: "skills/.curated/figma" },
  { name: "gh-address-comments", description: "Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate i", repo: "https://github.com/openai/skills", subpath: "skills/.curated/gh-address-comments" },
  { name: "gh-fix-ci", description: "Use when a user asks to debug or fix failing GitHub PR checks that run in GitHub Actions; use gh to inspect checks and logs, summarize failure context", repo: "https://github.com/openai/skills", subpath: "skills/.curated/gh-fix-ci" },
  { name: "hatch-pet", description: "Create, repair, validate, preview, and package Codex-compatible animated pets and pet spritesheets from character art, screenshots, generated images, or", repo: "https://github.com/openai/skills", subpath: "skills/.curated/hatch-pet" },
  { name: "jupyter-notebook", description: "Use when the user asks to create, scaffold, or edit Jupyter notebooks (.ipynb) for experiments, explorations, or tutorials; prefer the bundled templ", repo: "https://github.com/openai/skills", subpath: "skills/.curated/jupyter-notebook" },
  { name: "linear", description: "Manage issues, projects & team workflows in Linear. Use when the user wants to read, create or updates tickets in Linear.", repo: "https://github.com/openai/skills", subpath: "skills/.curated/linear" },
  { name: "migrate-to-codex", description: "Migrate supported instruction files, skills, agents, and MCP config into Codex project and global files.", repo: "https://github.com/openai/skills", subpath: "skills/.curated/migrate-to-codex" },
  { name: "netlify-deploy", description: "Deploy web projects to Netlify using the Netlify CLI (npx netlify). Use when the user asks to deploy, host, publish, or link a site/repo on Netlify,", repo: "https://github.com/openai/skills", subpath: "skills/.curated/netlify-deploy" },
  { name: "notion-knowledge-capture", description: "Capture conversations and decisions into structured Notion pages; use when turning chats/notes into wiki entries, how-tos, decisions, or FAQs with pro", repo: "https://github.com/openai/skills", subpath: "skills/.curated/notion-knowledge-capture" },
  { name: "pdf", description: "Use when tasks involve reading, creating, or reviewing PDF files where rendering and layout matter; prefer visual checks by rendering pages (Poppler", repo: "https://github.com/openai/skills", subpath: "skills/.curated/pdf" },
  { name: "playwright", description: "Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow deb", repo: "https://github.com/openai/skills", subpath: "skills/.curated/playwright" },
  { name: "render-deploy", description: "Deploy applications to Render by analyzing codebases, generating render.yaml Blueprints, and providing Dashboard deeplinks. Use when the user wants", repo: "https://github.com/openai/skills", subpath: "skills/.curated/render-deploy" },
  { name: "screenshot", description: "Use when the user explicitly asks for a desktop or system screenshot (full screen, specific app or window, or a pixel region), or when tool-specific c", repo: "https://github.com/openai/skills", subpath: "skills/.curated/screenshot" },
  { name: "security-best-practices", description: "Perform language and framework specific security best-practice reviews and suggest improvements. Trigger only when the user explicitly requests secu", repo: "https://github.com/openai/skills", subpath: "skills/.curated/security-best-practices" },
  { name: "sentry", description: "Use when the user asks to inspect Sentry issues or events, summarize recent production errors, or pull basic Sentry health data via the Sentry CLI; pe", repo: "https://github.com/openai/skills", subpath: "skills/.curated/sentry" },
  { name: "speech", description: "Use when the user asks for text-to-speech narration or voiceover, accessibility reads, audio prompts, or batch speech generation via the OpenAI Audio", repo: "https://github.com/openai/skills", subpath: "skills/.curated/speech" },
  { name: "transcribe", description: "Transcribe audio files to text with optional diarization and known-speaker hints. Use when a user asks to transcribe speech from audio/video, extract", repo: "https://github.com/openai/skills", subpath: "skills/.curated/transcribe" },
  { name: "vercel-deploy", description: "Deploy applications and websites to Vercel. Use when the user requests deployment actions like deploy my app, deploy and give me the link, push", repo: "https://github.com/openai/skills", subpath: "skills/.curated/vercel-deploy" },
  { name: "winui-app", description: "Bootstrap, develop, and design modern WinUI 3 desktop applications with C# and the Windows App SDK using official Microsoft guidance, WinUI Gallery", repo: "https://github.com/openai/skills", subpath: "skills/.curated/winui-app" },
  { name: "yeet", description: "Use only when the user explicitly asks to stage, commit, push, and open a GitHub pull request in one flow using the GitHub CLI (gh).", repo: "https://github.com/openai/skills", subpath: "skills/.curated/yeet" },
];

function getCuratedSkills() {
  const installed = new Set(listAllSkills().map(s => s.name));
  return CURATED_FALLBACK.map(s => ({
    ...s,
    installed: installed.has(s.name),
  }));
}

async function installSkill(repoUrl) {
  return new Promise((resolve, reject) => {
    let skillName = "";
    try {
      const url = new URL(repoUrl);
      skillName = path.basename(url.pathname);
      if (!skillName) throw new Error("Invalid repo URL");
    } catch {
      const match = repoUrl.match(/[:/]([^/]+?)(?:\.git)?$/);
      if (match) skillName = match[1];
      else return reject(new Error("Cannot parse repo URL"));
    }

    const targetDir = path.join(SKILLS_DIR, skillName);
    if (fs.existsSync(targetDir)) {
      return reject(new Error(`Skill "${skillName}" already exists`));
    }

    console.log(`[Skills] Cloning ${repoUrl} -> ${targetDir}`);
    const git = spawn("git", ["clone", "--depth", "1", repoUrl, targetDir], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
    });

    let stdout = "", stderr = "";
    git.stdout.on("data", d => stdout += d);
    git.stderr.on("data", d => stderr += d);

    git.on("close", (code) => {
      if (code !== 0) {
        try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
        return reject(new Error(`Git clone failed: ${stderr}`));
      }
      resolve({
        success: true,
        name: skillName,
        path: targetDir,
        message: `Skill "${skillName}" installed`,
      });
    });
    git.on("error", (err) => reject(new Error(`Git error: ${err.message}`)));
  });
}

function uninstallSkill(name) {
  const skillDir = path.join(SKILLS_DIR, name);
  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill "${name}" not found`);
  }
  const state = _readState();
  delete state[name];
  _writeState(state);
  try {
    fs.rmSync(skillDir, { recursive: true, force: true });
    return { success: true, message: `Skill "${name}" uninstalled` };
  } catch (err) {
    throw new Error(`Failed to delete: ${err.message}`);
  }
}

module.exports = { listAllSkills, getSkillDetail, installSkill, uninstallSkill, toggleSkill, isEnabled, getCuratedSkills, SKILLS_DIR };
