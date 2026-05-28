# CodeWhale Dashboard v2

A modern web-based dashboard for [CodeWhale](https://github.com/Hmbown/CodeWhale), the DeepSeek-first agentic coding terminal. Provides a graphical interface for managing sessions, MCP servers, tasks, and analytics — powered by the CodeWhale HTTP/SSE Runtime API.

## Architecture (v2)

The Dashboard now communicates with CodeWhale through its native HTTP/SSE Runtime API (`codewhale-tui serve --http`) instead of spawning CLI commands.

```
┌──────────────────────────────────────────────┐
│        CodeWhale Dashboard (Web GUI)         │
│  React + Vite + Tailwind  :4321              │
│  Express + WebSocket       :4322             │
│    │                                         │
│    │ HTTP/SSE                                │
│    ▼                                         │
│  codewhale-tui serve --http  :7878           │
│    │                                         │
│    ▼                                         │
│  DeepSeek API / NVIDIA API                   │
└──────────────────────────────────────────────┘
```

## Features

- **Chat Interface** — Full streaming chat with reasoning block visualization
- **Session Management** — Browse, search, resume CodeWhale threads
- **MCP Management** — View and reload MCP servers, inspect tools
- **Task Scheduler** — Create and manage cron/one-time tasks
- **Cost Analytics** — Monitor usage with daily and per-model breakdowns
- **Model Browser** — List available models, switch active model
- **Config Editor** — Visual editor for DeepSeek API settings
- **Dark/Light Theme** — Modern terminal-inspired UI

## Prerequisites

- Node.js 18+ and npm
- CodeWhale installed (`npm install -g codewhale`) — v0.8.42+
- DeepSeek API key configured (`DEEPSEEK_API_KEY` env var or `~/.deepseek/config.toml`)

## Quick Start

```bash
cd code-whale-dashboard
npm run setup
npm run dev
```

The Dashboard will:
1. Start `codewhale-tui serve --http` on port 7878
2. Start the Dashboard backend on port 4322
3. Start the Vite dev server on port 4321

Open [http://localhost:4321](http://localhost:4321)

## Project Structure

```
code-whale-dashboard/
├── frontend/                 # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/            # Overview, Chat, Sessions, Config, Models, Tasks, Analytics, Settings, MCP, Debug
│   │   ├── components/       # Layout (Sidebar, Header, StatusBar), Common
│   │   ├── api/              # API client (axios + SSE fetch)
│   │   ├── store/            # Zustand state management
│   │   └── hooks/            # useWebSocket
│   └── vite.config.ts
├── backend/                  # Express + WebSocket
│   ├── src/
│   │   ├── api/              # config, sessions, chat, models, tasks, analytics, files, settings, mcp
│   │   └── services/         # codewhale-client (HTTP API), session-manager, task-scheduler, cost-tracker
│   └── package.json
├── shared/                   # TypeScript type definitions
└── scripts/                  # setup.js
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Dashboard health + CodeWhale status |
| GET | `/api/models` | List available models |
| POST | `/api/models/switch` | Switch active model |
| GET | `/api/sessions` | List sessions (syncs with CodeWhale) |
| POST | `/api/sessions` | Create session |
| POST | `/api/chat` | Send message (non-streaming) |
| POST | `/api/chat/stream` | SSE streaming chat |
| GET | `/api/mcp/servers` | List MCP servers |
| POST | `/api/mcp/reload` | Reload MCP config |
| GET | `/api/mcp/capabilities` | CodeWhale capabilities |
| WS | `/ws` | Real-time status updates |

## Env Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4322` | Dashboard backend port |
| `NODE_ENV` | `development` | Node environment |
| `CODEWHALE_HOST` | `127.0.0.1` | CodeWhale API host |
| `CODEWHALE_PORT` | `7878` | CodeWhale API port |
| `DATA_DIR` | `~/.code-whale-dashboard` | Data directory |

## Building for Production

```bash
npm run build
npm start
```

## License

MIT
