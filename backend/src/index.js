const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { WebSocketServer } = require("ws");

// DB removed - all data now in CodeWhale Runtime
const codewhaleClient = require("./services/codewhale-client");
// Task scheduler removed - using CodeWhale Automations API

const configApi = require("./api/config");
const sessionsApi = require("./api/sessions");
const chatApi = require("./api/chat");
const modelsApi = require("./api/models");
const tasksApi = require("./api/tasks-api");
const analyticsApi = require("./api/analytics");
const filesApi = require("./api/files");
const settingsApi = require("./api/settings");
const mcpApi = require("./api/mcp");
const skillsApi = require("./api/skills");
const automationsApi = require("./api/automations");
const threadsApi = require("./api/threads");
const workspaceApi = require("./api/workspace");
const systemApi = require("./api/system");
const usageApi = require("./api/usage");

const PORT = process.env.PORT || 4322;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Set();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ["http://localhost:4321", "http://localhost:5173", "http://localhost:3000"] }));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));
}

app.use("/api/config", configApi);
app.use("/api/sessions", sessionsApi);
app.use("/api/chat", chatApi);
app.use("/api/models", modelsApi);
app.use("/api/tasks", tasksApi);
app.use("/api/analytics", analyticsApi);
app.use("/api/files", filesApi);
app.use("/api/settings", settingsApi);
app.use("/api/mcp", mcpApi);
app.use("/api/skills", skillsApi);
app.use("/api/automations", automationsApi);
app.use("/api/threads", threadsApi);
app.use("/api/workspace", workspaceApi);
app.use("/api/system", systemApi);
app.use("/api/usage", usageApi);

app.get("/api/health", async (req, res) => {
  const serverStatus = codewhaleClient.getServerStatus();
  let cwHealth = null;
  try { cwHealth = await codewhaleClient.healthCheck(); } catch {}
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    codewhale: {
      running: serverStatus.running,
      pid: serverStatus.pid,
      healthy: !!cwHealth,
      version: cwHealth ? cwHealth.version : null,
    },
    version: "2.1.0",
    storage: "codewhale", // indicate data lives in CodeWhale
  });
});

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`WS client connected (${clients.size})`);
  ws.send(JSON.stringify({ type: "connected", data: { clientCount: clients.size } }));
  ws.on("close", () => { clients.delete(ws); broadcast({ type: "client_count", data: { count: clients.size } }); });
  ws.on("error", () => { clients.delete(ws); });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const c of clients) { if (c.readyState === 1) c.send(msg); }
}

async function init() {
  console.log("Initializing CodeWhale Dashboard v2.1...");
  
  // Initialize DB for tasks scheduler (kept as fallback)
  // All data managed by CodeWhale Runtime

  try {
    await codewhaleClient.startServer();
    console.log("CodeWhale HTTP server connected");
  } catch (err) {
    console.warn("CodeWhale HTTP server not available:", err.message);
  }

  codewhaleClient.events.on("server-closed", () => broadcast({ type: "cw_status", data: { running: false } }));
  codewhaleClient.events.on("server-ready", () => broadcast({ type: "cw_status", data: { running: true } }));

  console.log("Dashboard initialized (data source: CodeWhale Runtime)");
}

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/ws")) return next();
  if (process.env.NODE_ENV === "production") {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  } else {
    res.json({ error: "Frontend not available in dev mode" });
  }
});

server.listen(PORT, () => {
  console.log(`CodeWhale Dashboard v2.1.0  http://localhost:${PORT}`);
  init();
});

module.exports = { app, server, wss, broadcast };
