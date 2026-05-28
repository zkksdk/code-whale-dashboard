// Shared type definitions for CodeWhale Dashboard v2.1

export interface Session {
  id: string;
  title: string;
  description?: string;
  model?: string;
  thread_id?: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
  message_count?: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: number;
  tokenCount?: number;
}

export interface ThreadRecord {
  id: string; title?: string; model: string; mode: string;
  workspace: string; archived?: boolean;
  created_at: string; updated_at: string;
}

export interface TurnRecord {
  id: string; thread_id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "interrupted" | "canceled";
  usage?: { input_tokens: number; output_tokens: number; cost_usd: number };
}

export interface SseEvent {
  seq: number; timestamp: string; thread_id: string; turn_id: string; item_id?: string;
  event: string;
  payload?: { delta?: string; kind?: string; message?: string; detail?: string; tool_name?: string; [key: string]: unknown };
}

export interface ActivityItem {
  id: string;
  kind: "tool_call" | "file_change" | "command_execution" | "status" | "error" | "approval_required";
  status: "running" | "completed" | "failed";
  summary: string; detail?: string; timestamp: number;
}

export interface McpServer { name: string; enabled: boolean; status: string; detail?: string; transport?: string; command?: string; tools?: string[]; }

export interface SkillDir { path?: string; present?: boolean; count?: number; }

export interface SkillsData {
  skills?: unknown;
  directories?: { global?: SkillDir; agents?: SkillDir; agents_global?: SkillDir; opencode?: SkillDir; claude?: SkillDir; local?: SkillDir; };
  plugins?: { path?: string; present?: boolean; count?: number };
  tools?: { path?: string; present?: boolean; count?: number };
}

export interface Automation {
  id: string; title: string; prompt: string;
  cron_expression?: string; status?: "active" | "paused" | "completed";
  last_run?: string; next_run?: string;
}

export interface UsageBucket {
  key: string; input_tokens: number; output_tokens: number;
  cached_tokens: number; reasoning_tokens: number; cost_usd: number; turns: number;
}

export interface UsageData {
  since?: string; until?: string; group_by: string;
  totals: UsageBucket;
  buckets: UsageBucket[];
}

export interface Task {
  id: string; title: string; description: string; prompt: string;
  type: "one_time" | "cron"; cron_expression: string | null; execute_at: string | null;
  status: "active" | "paused" | "completed" | "failed";
  run_count: number; error_count: number; last_run: number | null; next_run: string | null;
  created_at: number; updated_at: number;
}

export interface TaskRun { id: string; task_id: string; status: "completed" | "failed"; output: string; duration: number; executed_at: number; }

export interface CostRecord { id: string; session_id: string; model: string; prompt_tokens: number; completion_tokens: number; cost: number; created_at: number; }

export interface ModelInfo {
  id: string; name: string; provider: string; description?: string;
  contextWindow?: number; maxTokens?: number; pricing?: { input: number; output: number };
  capabilities?: string[]; status?: "available" | "unavailable";
}

export interface ConfigData { deepseek?: { api_key?: string; base_url?: string; provider?: string; model?: string; }; ui?: { theme?: "dark" | "light"; language?: string; autoSave?: boolean; }; }

export interface AnalyticsData { totalCost: number; totalTokens: number; sessionCount: number; period: { days: number; from: number; to: number }; daily: DailyUsage[]; byModel: ModelUsage[]; }

export interface DailyUsage { date: string; prompt_tokens: number; completion_tokens: number; cost: number; requests: number; }
export interface ModelUsage { model: string; prompt_tokens: number; completion_tokens: number; cost: number; requests: number; }

export interface SystemStatus { provider: string; configValid: boolean; wsConnected: boolean; cwRunning: boolean; version: string; }
export interface ToastMessage { id: string; type: "success" | "error" | "warning" | "info"; message: string; }
export interface ApiResponse<T> { success: boolean; data?: T; error?: string; message?: string; total?: number; }
