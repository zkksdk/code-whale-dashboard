import axios from "axios";

const API_BASE = "/api";
const api = axios.create({ baseURL: API_BASE, timeout: 30000, headers: { "Content-Type": "application/json" } });

// Health
export function getHealth() { return api.get("/health"); }

// Capabilities
export function getCapabilities() { return api.get("/mcp/capabilities"); }

// Config
export function getConfig() { return api.get("/config"); }
export function updateConfig(config: Record<string, unknown>) { return api.put("/config", config); }
export function reloadConfig() { return api.post("/config/reload"); }
export function testConfig() { return api.post("/config/test"); }

// Sessions
export function getSessions(params?: { page?: number; limit?: number; search?: string; include_archived?: boolean; archived_only?: boolean }) { return api.get("/sessions", { params }); }
export function getSession(id: string) { return api.get(`/sessions/${id}`); }
export function createSession(data: { title?: string; model?: string; workspace?: string }) { return api.post("/sessions", data); }
export function deleteSession(id: string) { return api.delete(`/sessions/${id}`); }
export function togglePinSession(id: string) { return api.post(`/sessions/${id}/pin`); }
export function getSessionMessages(id: string) { return api.get(`/sessions/${id}/messages`); }

// Threads
export function getThreads(params?: { limit?: number; search?: string; include_archived?: boolean; archived_only?: boolean }) { return api.get("/threads", { params }); }
export function getThreadSummary(params?: { limit?: number; search?: string; include_archived?: boolean; archived_only?: boolean }) { return api.get("/threads", { params }); }
export function forkThread(id: string) { return api.post(`/threads/${id}/fork`); }
export function patchThread(id: string, body: Record<string, unknown>) { return api.patch(`/threads/${id}`, body); }
export function resumeThread(id: string) { return api.post(`/threads/${id}/resume`); }
export function steerTurn(threadId: string, turnId: string, steer: string) { return api.post(`/threads/${threadId}/turns/${turnId}/steer`, { steer }); }
export function interruptTurn(threadId: string, turnId: string) { return api.post(`/threads/${threadId}/turns/${turnId}/interrupt`); }

// Chat
export function sendMessage(data: { sessionId?: string; message: string; model?: string; files?: string[] }) { return api.post("/chat", data); }

// Models
export function getModels() { return api.get("/models"); }
export function switchModel(model: string) { return api.post("/models/switch", { model }); }

// MCP
export function getMcpServers() { return api.get("/mcp/servers"); }
export function reloadMcp() { return api.post("/mcp/reload"); }

// Skills
export function getSkills() { return api.get("/skills"); }
export function getSkill(name: string) { return api.get("/skills/" + encodeURIComponent(name)); }
export function installSkill(repoUrl: string) { return api.post("/skills/install", { repoUrl }); }
export function uninstallSkill(name: string) { return api.delete("/skills/" + encodeURIComponent(name)); }
export function toggleSkill(name: string) { return api.patch("/skills/" + encodeURIComponent(name) + "/toggle"); }
export function getCuratedSkills() { return api.get("/skills/curated"); }

// Workspace
export function getWorkspaceStatus() { return api.get("/workspace"); }
export function getAvailableWorkspaces() { return api.get("/workspace/workspaces"); }
export function createWorkspaceDir(parentPath: string, name: string) { return api.post("/workspace/create", { parentPath, name }); }
export function browseDirectory(dirPath?: string) { return api.get("/workspace/browse", { params: { path: dirPath || "" } }); }

// Usage
export function getUsage(params?: { since?: string; until?: string; group_by?: string }) { return api.get("/usage", { params }); }

// Automations
export function getAutomations() { return api.get("/automations"); }
export function createAutomation(data: { title: string; prompt: string; cron_expression?: string }) { return api.post("/automations", data); }
export function deleteAutomation(id: string) { return api.delete(`/automations/${id}`); }
export function runAutomation(id: string) { return api.post(`/automations/${id}/run`); }
export function pauseAutomation(id: string) { return api.post(`/automations/${id}/pause`); }
export function resumeAutomation(id: string) { return api.post(`/automations/${id}/resume`); }
export function getAutomationRuns(id: string) { return api.get(`/automations/${id}/runs`); }

// Tasks (legacy)
export function getTasks(params?: { status?: string }) { return api.get("/tasks", { params }); }
export function createTask(data: { title: string; description?: string; prompt: string; type: string; cron_expression?: string; execute_at?: string }) { return api.post("/tasks", data); }
export function updateTask(id: string, data: Record<string, unknown>) { return api.put(`/tasks/${id}`, data); }
export function deleteTask(id: string) { return api.delete(`/tasks/${id}`); }
export function runTaskNow(id: string) { return api.post(`/tasks/${id}/run`); }
export function getTaskRuns(id: string) { return api.get(`/tasks/${id}/runs`); }

// Tasks (CodeWhale /v1/tasks)
export function getTasksApi(params?: { limit?: number }) { return api.get("/tasks", { params }); }
export function createTaskApi(data: { prompt: string; model?: string; workspace?: string; mode?: string; auto_approve?: boolean }) { return api.post("/tasks", data); }
export function getTaskApi(id: string) { return api.get(`/tasks/${id}`); }
export function cancelTaskApi(id: string) { return api.post(`/tasks/${id}/cancel`); }

// Analytics (legacy)
export function getAnalytics(params?: { days?: number }) { return api.get("/analytics", { params }); }
export function getCostBreakdown(params?: { days?: number }) { return api.get("/analytics/costs", { params }); }

// Files
export function uploadFiles(files: FileList | File[]) { const formData = new FormData(); Array.from(files).forEach((file) => { formData.append("files", file); }); return api.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }); }

// Files (workspace)
export function listFiles(dirPath?: string) { return api.get("/files/list", { params: { path: dirPath || "" } }); }
export function getFiles() { return api.get("/files"); }
export function deleteFile(id: string) { return api.delete(`/files/${id}`); }

// System
export function getSystem() { return api.get("/system"); }

// Settings
export function getSettings() { return api.get("/settings"); }
export function updateSettings(settings: Record<string, unknown>) { return api.put("/settings", settings); }

export default api;
