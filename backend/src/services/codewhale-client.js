const { spawn } = require("child_process");
const http = require("http");
const { EventEmitter } = require("events");

const CW_HOST = process.env.CODEWHALE_HOST || "127.0.0.1";
const CW_PORT = process.env.CODEWHALE_PORT || 7878;
const CW_BASE = `http://${CW_HOST}:${CW_PORT}`;

let serverProcess = null;
let authToken = process.env.DEEPSEEK_RUNTIME_TOKEN || null;
let healthCheckInterval = null;
const events = new EventEmitter();

function request(method, path, body = null, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CW_BASE);
    const options = {
      method, hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      timeout: opts.timeout || 30000,
    };
    const token = opts.authToken || authToken; if (token) options.headers["Authorization"] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) { const em = typeof parsed.error === "object" ? (parsed.error.message || JSON.stringify(parsed.error)) : parsed.error; reject(new Error(em || parsed.message || `HTTP ${res.statusCode}`)); }
          else resolve(parsed);
        } catch {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          else resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sseStream(path, body = null, opts = {}) {
  const url = new URL(path, CW_BASE);
  const options = {
    method: body ? "POST" : "GET", hostname: url.hostname, port: url.port, path: url.pathname + url.search,
    headers: { Accept: "text/event-stream", "Content-Type": "application/json", ...(opts.headers || {}) },
    timeout: opts.timeout || 0,
  };
  const token = opts.authToken || authToken; if (token) options.headers["Authorization"] = `Bearer ${token}`;
  const req = http.request(options);
  if (body) req.write(JSON.stringify(body));
  req.end();
  return req;
}

// ── Server lifecycle ──

async function startServer() {
  if (serverProcess) return { alreadyRunning: true };
  return new Promise((resolve, reject) => {
    const FIXED_TOKEN = "cw-dashboard-token"; authToken = FIXED_TOKEN; const args = ["serve", "--http", "--host", CW_HOST, "--port", String(CW_PORT), "--cors-origin", "http://localhost:4321", "--auth-token", FIXED_TOKEN];
    console.log(`[CodeWhale] Starting codewhale-tui ${args.join(" ")}`);
    serverProcess = spawn("codewhale-tui", args, { stdio: ["ignore", "pipe", "pipe"], env: process.env, shell: true });
    serverProcess.stdout.on("data", (d) => { const m = d.toString().trim(); if (m) console.log(`[CW] ${m}`); });
    serverProcess.stderr.on("data", (d) => { const m = d.toString().trim(); if (m) console.log(`[CW:err] ${m}`); });
    serverProcess.on("error", (err) => reject(err));
    serverProcess.on("close", (code) => {
      console.log(`[CodeWhale] Exited code=${code}`);
      serverProcess = null;
      clearInterval(healthCheckInterval);
      events.emit("server-closed", code);
    });
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try { await healthCheck(); clearInterval(poll); console.log("[CodeWhale] Ready");
        healthCheckInterval = setInterval(async () => { try { await healthCheck(); } catch { events.emit("health-fail"); } }, 30000);
        events.emit("server-ready"); resolve({ started: true });
      } catch { if (attempts >= 30) { clearInterval(poll); reject(new Error("CodeWhale server startup timeout")); } }
    }, 500);
  });
}

function stopServer() { clearInterval(healthCheckInterval); if (serverProcess) { serverProcess.kill("SIGTERM"); serverProcess = null; return true; } return false; }
function getServerStatus() { return { running: serverProcess !== null && !serverProcess.killed, pid: serverProcess ? serverProcess.pid : null }; }

// ── Core ──

async function healthCheck() { return request("GET", "/health"); }
async function getCapabilities() { try { const { execSync } = require('child_process'); return JSON.parse(execSync('codewhale doctor --json', { encoding: 'utf-8', timeout: 5000, stdio: ['ignore','pipe','ignore'] })); } catch { return {}; } }

// ── Models ──

async function listModels() { try { const caps = await getCapabilities(); const m = caps.default_text_model || 'deepseek-v4-pro'; const b = caps.base_url || 'https://api.deepseek.com/beta'; return [{ id: m, name: m, provider: 'deepseek', is_default: true, base_url: b }]; } catch { return []; } }
async function switchModel(modelId) { return { model: modelId, note: 'Model switch via config.toml' }; }

// ── Skills ──

async function getSkills() { return request("GET", "/v1/skills"); }
async function setSkillEnabled(name, enabled) { return request("POST", "/v1/skills/" + name, { enabled }); }

// ── Workspace ──

async function getWorkspaceStatus() { return request("GET", "/v1/workspace/status"); }

// ── Config ──

async function getConfig() { return await getCapabilities(); }
async function updateConfig(config) { return { success: true, note: 'Update config.toml directly' }; }
async function reloadConfig() { return { success: true }; }

// ── Usage ──

async function getUsage(opts = {}) {
  const params = [];
  if (opts.since) params.push(`since=${opts.since}`);
  if (opts.until) params.push(`until=${opts.until}`);
  if (opts.group_by) params.push(`group_by=${opts.group_by}`);
  const qs = params.length > 0 ? "?" + params.join("&") : "";
  return request("GET", `/v1/usage${qs}`);
}

// ── Threads ──

async function createThread(opts = {}) { return request("POST", "/v1/threads", { model: opts.model, mode: opts.mode || "Agent", workspace: opts.workspace, auto_approve: opts.auto_approve || false }); }
async function listThreads(opts = {}) {
  const params = [];
  if (opts.limit) params.push(`limit=${opts.limit}`);
  if (opts.include_archived) params.push("include_archived=true");
  if (opts.archived_only) params.push("archived_only=true");
  const qs = params.length > 0 ? "?" + params.join("&") : "";
  return request("GET", `/v1/threads${qs}`);
}
async function getThreadSummary(opts = {}) {
  const params = [];
  if (opts.limit) params.push(`limit=${opts.limit}`);
  if (opts.search) params.push(`search=${encodeURIComponent(opts.search)}`);
  if (opts.include_archived) params.push("include_archived=true");
  if (opts.archived_only) params.push("archived_only=true");
  const qs = params.length > 0 ? "?" + params.join("&") : "";
  return request("GET", `/v1/threads/summary${qs}`);
}
async function getThread(threadId) { return request("GET", `/v1/threads/${threadId}`); }
async function patchThread(threadId, body) { return request("PATCH", `/v1/threads/${threadId}`, body); }
async function deleteThread(threadId) { return request("DELETE", `/v1/threads/${threadId}`); }
async function forkThread(threadId) { return request("POST", `/v1/threads/${threadId}/fork`); }
async function resumeThread(threadId) { return request("POST", `/v1/threads/${threadId}/resume`); }
function getThreadEvents(threadId, sinceSeq = 0) { return sseStream(`/v1/threads/${threadId}/events?since_seq=${sinceSeq}`); }

// ── Turns ──

async function sendMessage(threadId, message, opts = {}) { return request("POST", `/v1/threads/${threadId}/turns`, { prompt: message, model: opts.model, mode: opts.mode, auto_approve: opts.auto_approve }); }
function streamMessage(threadId, message, opts = {}) { return sseStream(`/v1/threads/${threadId}/turns`, { prompt: message, model: opts.model, mode: opts.mode, auto_approve: true }); }
async function steerTurn(threadId, turnId, steer) { return request("POST", `/v1/threads/${threadId}/turns/${turnId}/steer`, { steer }); }
async function interruptTurn(threadId, turnId) { return request("POST", `/v1/threads/${threadId}/turns/${turnId}/interrupt`); }
async function compactThread(threadId) { return request("POST", `/v1/threads/${threadId}/compact`); }

// ── Sessions (legacy) ──

async function listSessions() { return request("GET", "/v1/sessions"); }
async function getSession(sessionId) { return request("GET", `/v1/sessions/${sessionId}`); }
async function deleteSession(sessionId) { return request("DELETE", `/v1/sessions/${sessionId}`); }
async function resumeSession(sessionId) { return request("POST", `/v1/sessions/${sessionId}/resume-thread`); }

// ── MCP ──

async function listMcpServers() { return request("GET", "/v1/apps/mcp/servers"); }
async function listMcpTools(server) { const qs = server ? `?server=${server}` : ""; return request("GET", `/v1/apps/mcp/tools${qs}`); }
async function reloadMcp() { return { message: 'MCP reload uses codewhale serve restart' }; }

// ── Automations ──

async function listAutomations() { return request("GET", "/v1/automations"); }
async function getAutomation(id) { return request("GET", `/v1/automations/${id}`); }
async function createAutomation(body) { return request("POST", "/v1/automations", body); }
async function updateAutomation(id, body) { return request("PATCH", `/v1/automations/${id}`, body); }
async function deleteAutomation(id) { return request("DELETE", `/v1/automations/${id}`); }
async function runAutomation(id) { return request("POST", `/v1/automations/${id}/run`); }
async function pauseAutomation(id) { return request("POST", `/v1/automations/${id}/pause`); }
async function resumeAutomation(id) { return request("POST", `/v1/automations/${id}/resume`); }
async function listAutomationRuns(id, limit = 20) { return request("GET", `/v1/automations/${id}/runs?limit=${limit}`); }

// ── Tasks (v0.8.47+ /v1/tasks) ──

async function listTasks(limit = 50) { return request("GET", `/v1/tasks?limit=${limit}`); }
async function createTask(body) { return request("POST", "/v1/tasks", body); }
async function getTask(id) { return request("GET", `/v1/tasks/${id}`); }
async function cancelTask(id) { return request("POST", `/v1/tasks/${id}/cancel`); }


// ── Runtime Info ──

async function getRuntimeInfo() { return request("GET", "/v1/runtime/info"); }

// ── Approvals ──

async function decideApproval(approvalId, decision, remember = false) { return request("POST", `/v1/approvals/${approvalId}`, { decision, remember }); }

// ── Thread Delete ──

async function deleteThreadDirect(threadId) { return request("DELETE", `/v1/threads/${threadId}`); }
module.exports = {
  events, startServer, stopServer, getServerStatus,
  healthCheck, getCapabilities,
  listModels, switchModel,
  getSkills, setSkillEnabled, getWorkspaceStatus,
  getConfig, updateConfig, reloadConfig,
  getUsage,
  createThread, listThreads, getThreadSummary, getThread, patchThread, deleteThread, forkThread, resumeThread, getThreadEvents,
  sendMessage, streamMessage, steerTurn, interruptTurn, compactThread,
  listSessions, getSession, deleteSession, resumeSession,
  listMcpServers, listMcpTools, reloadMcp,
  listAutomations, getAutomation, createAutomation, updateAutomation, deleteAutomation, runAutomation, pauseAutomation, resumeAutomation, listAutomationRuns,
  listTasks, createTask, getTask, cancelTask,
  getRuntimeInfo, decideApproval, deleteThreadDirect,
};
