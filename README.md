# CodeWhale Dashboard

<p align="center">
  <img src="https://img.shields.io/github/stars/zkksdk/code-whale-dashboard?style=social" alt="Stars">
  <img src="https://img.shields.io/github/license/zkksdk/code-whale-dashboard" alt="License">
  <img src="https://img.shields.io/badge/CodeWhale-v0.8.47-blue" alt="CodeWhale">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/i18n-中文_|_English-purple" alt="i18n">
</p>

<p align="center">
  <b>🖥️ 现代化 Web 仪表盘，让命令行 AI 编程助手拥有图形化界面</b>
</p>

---

## 这是什么？

[CodeWhale](https://github.com/Hmbown/CodeWhale) 是一款基于 DeepSeek 的终端 AI 编程助手，功能强大但只有命令行界面。**CodeWhale Dashboard** 为它打造了一个现代化、多标签、支持中英双语的 Web 管理后台，让一切操作可视化。

> 如果你觉得 CodeWhale 好用但命令行操作不够直观，这个项目就是为你准备的。

## ✨ 功能亮点

| 模块 | 说明 |
|------|------|
| 💬 **对话** | 全功能流式聊天，支持推理过程可视化、工具调用展示、Plan 面板 |
| 📋 **会话管理** | 浏览/搜索/归档/重命名/批量操作，AI 助手帮你分析会话 |
| 🔧 **MCP 管理** | 查看和重载 MCP 服务器，检查工具列表和连接状态 |
| 📝 **任务系统** | 创建/查看/取消任务，Checklist、Gates、Tool Calls、Timeline 全展示 |
| 🧩 **技能管理** | 浏览已安装技能，一键安装/卸载/启用/禁用 |
| 📊 **数据分析** | Token 用量图表、费用追踪、按模型拆分 |
| ⚙️ **配置** | 可视化管理 API Key、Base URL、模型、主题、语言 |
| 🌍 **国际化** | 完整中英文双语支持 |
| 🔄 **WebSocket** | 实时状态推送，无需刷新 |

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────┐
│        CodeWhale Dashboard (Web GUI)         │
│  React 18 + Vite + Tailwind CSS  :4321       │
│  Express + WebSocket + SQLite    :4322       │
│    │                                         │
│    │ HTTP REST + SSE                         │
│    ▼                                         │
│  codewhale-tui serve --http  :7878           │
│    │                                         │
│    ▼                                         │
│  DeepSeek API / 任何 OpenAI 兼容 API         │
└──────────────────────────────────────────────┘
```

**前端**: React 18 · TypeScript · Vite · Tailwind CSS · Zustand · TanStack Query · Recharts · React Router · date-fns · Lucide Icons

**后端**: Express · WebSocket (ws) · SQLite (better-sqlite3) · Axios

## 🚀 快速开始

### 前置条件

- [CodeWhale](https://github.com/Hmbown/CodeWhale) v0.8.47+
- Node.js 18+

### 一键启动

```bash
# 1. 启动 CodeWhale HTTP 服务
codewhale-tui serve --http --port 7878

# 2. 启动 Dashboard
cd code-whale-dashboard
npm install
npm run dev
```

浏览器打开 `http://localhost:4321` 即可使用。

## 📂 项目结构

```
code-whale-dashboard/
├── frontend/                 # React + Vite
│   └── src/
│       ├── api/              # API 客户端
│       ├── components/       # Chat/PlanPanel/ToolCallCard...
│       ├── i18n/             # 中英文翻译
│       ├── pages/            # 15 个页面
│       ├── store/            # Zustand 状态
│       └── hooks/            # useWebSocket
├── backend/                  # Express + WebSocket
│   └── src/
│       ├── api/              # REST 端点
│       └── services/         # CodeWhale 客户端
├── shared/                   # 共享类型定义
└── scripts/                  # 工具脚本
```

## 🤝 参与贡献

一个人的精力有限，欢迎大家一起完善！无论你是前端、后端、设计还是文档大佬，都能找到适合的任务：

### 🎯 适合新手的任务（Good First Issues）

- [ ] 优化移动端响应式布局
- [ ] 添加暗色/亮色主题切换动画
- [ ] 完善英文翻译（部分提示词仍为中文）
- [ ] 编写单元测试
- [ ] 添加 Docker 部署支持
- [ ] 制作项目 Logo

### 🔥 有挑战的任务

- [ ] Chat 页面支持多 Tab 同时对话
- [ ] 对话消息导出为 Markdown/PDF
- [ ] 技能市场（浏览和安装社区技能）
- [ ] 仪表盘小组件自定义布局
- [ ] PWA 支持（桌面应用化）
- [ ] Agent 对话历史可视化（树形分支）

### 贡献流程

```bash
# 1. Fork 本仓库
# 2. 创建你的特性分支
git checkout -b feature/amazing-feature
# 3. 提交更改
git commit -m "feat: add amazing feature"
# 4. 推送到分支
git push origin feature/amazing-feature
# 5. 发起 Pull Request
```

## 🗺️ 路线图

- [x] 核心仪表盘（概览/对话/会话/配置）
- [x] MCP 服务器管理
- [x] 技能管理（安装/卸载/浏览）
- [x] 任务系统（创建/追踪/Checklist）
- [x] 数据分析（Token/费用图表）
- [x] 中英文国际化
- [x] AI 会话助手
- [ ] 移动端适配
- [ ] Docker 一键部署
- [ ] 插件系统
- [ ] 多用户支持

## 📄 License

MIT © 2026

---

<p align="center">
  ⭐ 如果这个项目对你有用，请点个 Star 支持一下！
</p>
