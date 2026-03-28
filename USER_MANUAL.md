# OpenClawFactory — User Manual

**Version 0.33**

---

## Table of Contents

1. [What Is OpenClawFactory?](#1-what-is-openclaw-factory)
2. [Architecture Overview](#2-architecture-overview)
3. [Installation](#3-installation)
4. [Configuration](#4-configuration)
5. [Running the App](#5-running-the-app)
6. [Using the Dashboard](#6-using-the-dashboard)
7. [Using the Telegram Bot](#7-using-the-telegram-bot)
8. [API Reference](#8-api-reference)
9. [Agent Roster](#9-agent-roster)
10. [Pipeline Stages](#10-pipeline-stages)
11. [Deployment on DigitalOcean](#11-deployment-on-digitalocean)
12. [Process Management with PM2](#12-process-management-with-pm2)
13. [Logs & Monitoring](#13-logs--monitoring)
14. [Codebase Reference](#14-codebase-reference)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. What Is OpenClawFactory?

OpenClawFactory is a **multi-agent AI factory floor**. It orchestrates a team of autonomous Claude-powered AI agents through a structured work pipeline, visualized in real time on a browser-based dashboard called **Mission Control**.

Each agent has a specialized role — researcher, developer, analyst, or QA engineer. When you assign a task, an agent picks it up, works through the pipeline stages (briefing → research → build → QA → ship), and returns the result. Every step is streamed live to the dashboard and optionally delivered via Telegram.

**Key capabilities:**

- Assign tasks to named agents or let the system auto-assign to the first idle agent
- Watch agents move through pipeline stages with animated pixel-art sprites in real time
- View full task logs, agent messages, and completed results
- Interact via the web dashboard or Telegram bot
- Deploy to any Ubuntu server with a single install script

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Mobile App                      │
│           http://YOUR_SERVER_IP (Nginx on port 80)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    / (Next.js)   /api/* (FastAPI)  /ws (WebSocket)
      port 3000      port 8000        port 8000
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Agents | Open Interpreter + Claude (Anthropic API) | Execute tasks with code and reasoning |
| Backend API | FastAPI + uvicorn | REST endpoints + WebSocket server |
| Frontend UI | Next.js 14 + React 18 + TypeScript | Real-time dashboard |
| Animations | Framer Motion | Smooth sprite transitions |
| Styling | Tailwind CSS | Factory-themed dark UI |
| Real-time comms | WebSocket (native) | Live agent updates to browser |
| Database | SQLite (WAL mode) | Persistent task and message log |
| Process manager | PM2 | Daemonize backend and frontend |
| Reverse proxy | Nginx | Route /api, /ws, and static files |
| Notifications | python-telegram-bot | Optional Telegram interface |
| Deployment | Bash scripts | Automated Ubuntu server setup |

### Communication flow

1. User assigns a task via the dashboard form or Telegram command
2. FastAPI backend creates a task record in SQLite and spawns a worker thread
3. The worker thread runs an Open Interpreter agent (Claude model)
4. As the agent progresses, each state change is broadcast over WebSocket to all connected browsers
5. The Next.js frontend receives events and updates the animated pipeline display in real time
6. On completion, the task result is saved to SQLite and displayed in the Tasks tab

---

## 3. Installation

### Prerequisites

- Ubuntu 22.04 or 24.04 (DigitalOcean Droplet recommended: 2 GB RAM minimum)
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional) A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Quick install on a fresh server

Run the installer as root on your Ubuntu server:

```bash
bash install.sh
```

The installer will:

1. Install system packages (Python 3, Node 20 LTS, Nginx, PM2)
2. Add a 2 GB swap file if RAM is below 2.2 GB
3. Copy project files to `/opt/openclaw-factory`
4. Create a Python virtual environment and install Python dependencies
5. Install Node.js dependencies for the frontend
6. Prompt you interactively for your API keys, dashboard password, and Telegram credentials
7. Build the Next.js frontend
8. Configure Nginx as a reverse proxy
9. Start both backend and frontend under PM2
10. Enable PM2 to restart on server reboot
11. Open firewall ports 80, 3000, and 8000

At the end, the installer prints your dashboard URL and useful management commands.

### Deploy from your local machine

If you are deploying from a local copy of the repository to a remote server:

```bash
bash deploy.sh user@your-droplet-ip
```

This rsync's the project files to the server (excluding `.git`, `venv`, `node_modules`, `data`, and `logs`) and then runs `install.sh` remotely over SSH.

### Local development (no server)

```bash
# Terminal 1 — backend
cd backend
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py --no-telegram

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 4. Configuration

All configuration is stored in a `.env` file at the project root. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Full configuration reference

```env
# ─── AI BACKENDS ──────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=your_claude_key_here   # Required. Get from console.anthropic.com
OPENAI_API_KEY=                          # Optional. For OpenAI-based agents.

# ─── AGENT PERSONAS (up to 8) ─────────────────────────────────────────────────
# Name, role description, and Claude model for each agent.
# If these are omitted, four default agents (Henry, Charlie, Sarah, Max) are used.
AGENT_1_NAME=Henry
AGENT_1_ROLE=Researcher
AGENT_1_MODEL=claude-sonnet-4-6

AGENT_2_NAME=Charlie
AGENT_2_ROLE=Developer
AGENT_2_MODEL=claude-sonnet-4-6

AGENT_3_NAME=Sarah
AGENT_3_ROLE=Analyst
AGENT_3_MODEL=claude-sonnet-4-6

AGENT_4_NAME=Max
AGENT_4_ROLE=QA Engineer
AGENT_4_MODEL=claude-sonnet-4-6

# Add AGENT_5_* through AGENT_8_* for additional agents.

# ─── TELEGRAM BOT (optional) ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=                      # From @BotFather on Telegram
TELEGRAM_CHAT_ID=                        # Your personal or group chat ID

# ─── DASHBOARD SECURITY ───────────────────────────────────────────────────────
DASHBOARD_PASSWORD=changeme              # Set a strong password for the web UI

# ─── BACKEND ──────────────────────────────────────────────────────────────────
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0

# ─── FRONTEND ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

> **Note:** The install script updates `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_WS_URL` automatically with your server's public IP.

---

## 5. Running the App

### Production (PM2)

```bash
# Start both backend and frontend
pm2 start ecosystem.config.js

# Stop all processes
pm2 stop all

# Restart
pm2 restart all

# View status
pm2 status

# View logs live
pm2 logs
```

### Individual processes

```bash
# Backend only
pm2 start ecosystem.config.js --only openclaw-backend

# Frontend only
pm2 start ecosystem.config.js --only openclaw-frontend
```

### Verify the app is running

```bash
# Check health endpoint
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}

# Check version
curl http://localhost:8000/api/version
# Expected: {"version":"0.33"}
```

---

## 6. Using the Dashboard

Open your browser and navigate to `http://YOUR_SERVER_IP`. You will see **Mission Control** — the OpenClawFactory dashboard.

### Top bar

The top bar shows four live counters:
- **Agents** — total number of configured agents
- **Active** — agents currently running a task
- **Done Today** — tasks completed since midnight
- **Connection status** — green glow when the WebSocket is connected; reconnects automatically if dropped

### Agent Roster

Below the top bar is a horizontal strip showing all agents with their color badge, current pipeline stage, and a pulsing indicator when busy.

| Agent | Color | Default Role |
|-------|-------|--------------|
| Henry | Cyan | Researcher |
| Charlie | Amber | Developer |
| Sarah | Green | Analyst |
| Max | Purple | QA Engineer |

### Tabs

#### Factory Floor tab (🏭)

The main view. Shows the six pipeline stages side by side. Agents appear as animated pixel-art sprites in whichever stage they are currently working in.

- **Idle agents** in the Breakroom bob gently up and down
- **Working agents** in Research, Build, or Ship rock side to side
- Agents animate smoothly as they transition between stages

At the top of this tab is the **Task Assignment Form**.

##### Assigning a task

1. Type a task title in the **Title** field (required)
2. Optionally add more context in the **Description** field
3. Optionally select a specific agent from the **Agent** dropdown; leave it on "Auto-assign" to send the task to the first idle agent
4. Click **Assign Task**

If all agents are busy, a warning message is shown and the button is disabled until an agent becomes free.

#### Tasks tab (📋)

Shows a table of all tasks with columns for title, assigned agent, status, and time. Statuses are color-coded:

| Status | Color | Meaning |
|--------|-------|---------|
| pending | Gray | Created, not yet started |
| running | Cyan | Agent is actively working |
| completed | Green | Finished successfully |
| failed | Red | Encountered an error |

Click any row to expand it and view the full task result and agent message log.

The **Clear done** button at the top right removes all completed and failed tasks from the list (and from the database).

#### Activity Log tab (📡)

A real-time feed of all events — agent movements, task creation, task updates, and agent messages. Shows the last 60 events with timestamps. Useful for debugging or monitoring what agents are doing.

---

## 7. Using the Telegram Bot

If you configured `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, you can interact with OpenClawFactory through Telegram.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Show available commands |
| `/status` | List all agents and their current pipeline stage |
| `/tasks` | Show the last 10 tasks with their status |
| `/assign [Agent] task description` | Assign a task, optionally to a named agent |

### Examples

```
/assign Research the latest Claude model benchmarks
/assign Charlie Write a Python function to parse CSV files
/status
/tasks
```

Sending any plain text message (not starting with `/`) also auto-assigns it as a task to the first idle agent.

The bot replies with the assigned agent name and task ID. You can monitor progress in the dashboard or check `/status` again later.

---

## 8. API Reference

All endpoints are available at `http://YOUR_SERVER_IP/api/`.

### `GET /api/health`
Returns the health status of the backend.
```json
{"status": "ok"}
```

### `GET /api/version`
Returns the running application version. Use this to verify the deployed code matches the expected release.
```json
{"version": "0.33"}
```

### `GET /api/agents`
Returns the current state of all agents.
```json
{
  "agents": [
    {
      "name": "Henry",
      "role": "Researcher",
      "stage": "breakroom",
      "task_id": null,
      "task_title": null,
      "model": "claude-sonnet-4-6",
      "busy": false
    }
  ]
}
```

### `GET /api/tasks?limit=20`
Returns the most recent tasks. `limit` defaults to 20.
```json
{
  "tasks": [
    {
      "id": "abc123",
      "title": "Research LLM benchmarks",
      "description": "",
      "agent_name": "Henry",
      "stage": "ship",
      "status": "completed",
      "result": "...",
      "created_at": "2026-03-27T10:00:00",
      "updated_at": "2026-03-27T10:02:30"
    }
  ]
}
```

### `GET /api/tasks/{task_id}`
Returns a single task with its full message log.
```json
{
  "task": { "id": "abc123", "title": "...", ... },
  "messages": [
    {"task_id": "abc123", "agent_name": "Henry", "role": "assistant", "content": "...", "created_at": "..."}
  ]
}
```

### `POST /api/tasks`
Assign a new task.

**Request body:**
```json
{
  "title": "Research LLM benchmarks",
  "description": "Focus on context window and cost comparisons",
  "agent": "Henry"
}
```
`description` and `agent` are optional. Leave `agent` empty for auto-assignment.

**Response:**
```json
{"task_id": "abc123", "agent": "Henry"}
```

**Error responses:**
- `400` — title is missing
- `409` — named agent is busy, or all agents are busy

### `DELETE /api/tasks`
Clears all completed and failed tasks from the database.
```json
{"deleted": 5}
```

### `GET /api/stages`
Returns the list of pipeline stages in order.
```json
{"stages": ["breakroom", "briefing", "research", "build", "qa", "ship"]}
```

### WebSocket `/ws`
Connect to receive real-time events. The frontend connects automatically.

On connection, the server sends an `init` event with current state:
```json
{
  "type": "init",
  "data": {
    "agents": [...],
    "tasks": [...]
  }
}
```

Subsequent events:
```json
{"type": "agent_moved",  "data": {"name": "Henry", "stage": "research", ...}}
{"type": "task_created", "data": {"id": "abc123", "title": "...", ...}}
{"type": "task_updated", "data": {"id": "abc123", "status": "completed", ...}}
{"type": "message",      "data": {"task_id": "abc123", "content": "...", ...}}
```

---

## 9. Agent Roster

### Default agents

| Name | Role | Specialty | Color |
|------|------|-----------|-------|
| Henry | Researcher | Finds, verifies, and summarises information from the web | Cyan |
| Charlie | Developer | Writes clean, tested Python, JavaScript, and bash code | Amber |
| Sarah | Analyst | Analyses data, spots trends, and produces clear reports | Green |
| Max | QA Engineer | Reviews code, logic, and outputs for bugs and security issues | Purple |

Each agent runs a separate Claude model instance via Open Interpreter. The model defaults to `claude-sonnet-4-6` but can be set per agent in `.env`.

### Adding custom agents

Add up to 8 agents by extending `.env`:

```env
AGENT_5_NAME=Diana
AGENT_5_ROLE=Writer
AGENT_5_MODEL=claude-sonnet-4-6
```

Restart the backend after changing `.env`.

---

## 10. Pipeline Stages

Tasks move through six stages in order:

| Stage | Icon | Description |
|-------|------|-------------|
| Breakroom | 🛋 | Agent is idle and available for new tasks |
| Briefing | 📋 | Agent has received the task and is preparing |
| Research | 🔍 | Agent is gathering information and context |
| Build | 🔨 | Agent is executing — writing code, drafting output, running analysis |
| QA | 🔬 | Agent is reviewing its own output for quality and correctness |
| Ship | 🚀 | Agent is finalising and delivering the result |

After shipping, the agent automatically returns to the Breakroom and is available for the next task.

---

## 11. Deployment on DigitalOcean

### Recommended Droplet

- **Image:** Ubuntu 22.04 or 24.04 LTS
- **Size:** 2 GB RAM / 1 vCPU minimum (4 GB recommended for multiple concurrent agents)
- **Region:** Any

### Step-by-step

1. Create a Droplet and note its public IP address
2. SSH into the server as root
3. Clone or upload the project files
4. Run the install script:
   ```bash
   bash install.sh
   ```
5. Follow the interactive prompts for API keys and passwords
6. Once complete, visit `http://YOUR_IP` in a browser

### Nginx configuration

Nginx listens on port 80 and routes traffic:

```
/           → Next.js frontend on port 3000
/api/*      → FastAPI backend on port 8000
/ws         → WebSocket endpoint on port 8000 (with upgrade headers)
```

The WebSocket proxy is configured with a 24-hour timeout to keep long-running agent sessions alive.

### Updating the deployment

After pushing new code to GitHub:

```bash
# On the server
cd /opt/openclaw-factory
git pull
pm2 restart all
```

Or re-run `deploy.sh` from your local machine to push and reinstall from scratch.

---

## 12. Process Management with PM2

PM2 manages two processes defined in `ecosystem.config.js`:

| Process name | Command | Working directory |
|-------------|---------|-------------------|
| `openclaw-backend` | `python main.py` (via venv) | `/opt/openclaw-factory/backend` |
| `openclaw-frontend` | `npm start` | `/opt/openclaw-factory/frontend` |

### Useful PM2 commands

```bash
pm2 status                        # Show all process statuses
pm2 logs                          # Stream all logs
pm2 logs openclaw-backend         # Backend logs only
pm2 logs openclaw-frontend        # Frontend logs only
pm2 restart openclaw-backend      # Restart backend only
pm2 restart all                   # Restart both
pm2 stop all                      # Stop both
pm2 delete all                    # Remove from PM2 (does not delete files)
pm2 startup                       # Regenerate boot script
pm2 save                          # Save current process list for boot
```

---

## 13. Logs & Monitoring

### Log files

| File | Contents |
|------|----------|
| `logs/backend.log` | Backend API, agent events, errors (rotating, max 5 MB, 2 backups) |
| `logs/backend-out.log` | PM2 stdout for backend |
| `logs/backend-err.log` | PM2 stderr for backend |
| `logs/frontend-out.log` | PM2 stdout for Next.js |
| `logs/frontend-err.log` | PM2 stderr for Next.js |

### Verify version matches deployment

```bash
curl http://YOUR_SERVER_IP/api/version
```

Should return `{"version":"0.33"}`. If it returns a different version or an error, the deployment may be running old code — restart PM2 or redeploy.

### Database

The SQLite database is at `data/factory.db`. It stores all tasks and agent messages and persists across restarts.

To inspect it directly on the server:
```bash
sqlite3 /opt/openclaw-factory/data/factory.db
sqlite> SELECT id, title, status, agent_name FROM tasks ORDER BY created_at DESC LIMIT 10;
```

---

## 14. Codebase Reference

```
OpenClawFactory/
├── .env.example              # Configuration template
├── .gitignore
├── README.md                 # Quick start
├── USER_MANUAL.md            # This document
├── install.sh                # Ubuntu server installer
├── deploy.sh                 # Remote deploy script
├── ecosystem.config.js       # PM2 process definitions
├── nginx.conf                # Reverse proxy configuration
│
├── backend/
│   ├── main.py               # FastAPI app, WebSocket server, entry point
│   ├── requirements.txt      # Python dependencies
│   │
│   ├── core/
│   │   ├── config.py         # Config dataclass, .env loader, agent personas
│   │   └── state.py          # SQLite state manager, in-memory agent state, broadcaster
│   │
│   ├── agents/
│   │   ├── manager.py        # AgentManager: task routing, agent registry
│   │   └── runner.py         # AgentRunner: Open Interpreter execution per agent
│   │
│   └── delivery/
│       └── telegram_bot.py   # Optional Telegram bot interface
│
└── frontend/
    ├── package.json
    ├── next.config.js         # Standalone output, /api and /ws rewrites
    ├── tailwind.config.ts     # Factory color theme, custom animations
    │
    └── src/
        ├── app/
        │   ├── layout.tsx     # Root layout, CRT scanline overlay
        │   ├── page.tsx       # Main dashboard: Factory Floor, Tasks, Log tabs
        │   └── globals.css    # Base styles, fonts, scrollbar, CRT effect
        │
        ├── components/
        │   ├── AgentSprite.tsx     # Pixel-art SVG sprites with Framer Motion
        │   ├── PipelineStage.tsx   # Stage container with grid background and glow
        │   └── TaskInput.tsx       # Task assignment form
        │
        └── lib/
            ├── types.ts        # TypeScript interfaces: AgentState, Task, Message, WSEvent
            └── useFactory.ts   # React hook: WebSocket connection, state, assignTask()
```

### Key source files explained

#### `backend/main.py`
The application entry point. Creates the FastAPI app, registers all REST and WebSocket endpoints, captures the uvicorn event loop so agent threads can safely post WebSocket broadcasts, and starts the Telegram bot in a daemon thread if configured.

#### `backend/core/config.py`
Reads `.env` and constructs a typed `Config` object. Loads up to 8 agent personas from `AGENT_N_NAME/ROLE/MODEL` variables, or falls back to the four default agents.

#### `backend/core/state.py`
Thread-safe singleton that owns:
- The SQLite database (`data/factory.db`) with `tasks` and `messages` tables
- An in-memory `_agents` dictionary
- A broadcast callback (`_broadcast_cb`) that fires a JSON event over WebSocket whenever any state changes

#### `backend/agents/manager.py`
Owns all `AgentRunner` instances. Routes `assign_task()` calls to the correct runner (by name or auto-picks the first idle one). Raises errors if the agent is unknown or all agents are busy.

#### `backend/agents/runner.py`
One instance per agent. Spawns a daemon thread to execute tasks. Initialises a fresh `OpenInterpreter` per task with:
- The agent's role-specific system prompt
- The Claude model from config
- 8,000-token context window (prevents rate-limit errors)
- Auto-run enabled (no interactive prompts)

Streams the interpreter output chunk by chunk, logs each chunk to SQLite, and moves the agent through all pipeline stages.

#### `backend/delivery/telegram_bot.py`
Optional Telegram interface. Handles `/assign`, `/status`, `/tasks`, and `/start` commands. Plain text messages are also treated as task assignments. Runs in its own async event loop in a daemon thread.

#### `frontend/src/lib/useFactory.ts`
The central React hook. Manages the WebSocket connection (auto-reconnects every 3 seconds on drop). Handles all incoming event types (`init`, `agent_moved`, `task_created`, `task_updated`, `message`) and exposes `assignTask()` for the form component.

#### `frontend/src/components/AgentSprite.tsx`
Pixel-art SVG sprites (28×40 px) for each agent, rendered with `imageRendering: pixelated`. Uses Framer Motion for entry/exit animations (spring physics) and layout transitions. Idle agents bob; working agents rock.

---

## 15. Troubleshooting

### Dashboard shows "Disconnected"

The WebSocket connection to the backend dropped or was never established.

1. Check the backend is running: `pm2 status`
2. Check for backend errors: `pm2 logs openclaw-backend`
3. Check Nginx is running: `systemctl status nginx`
4. Verify the `/ws` proxy in Nginx config includes the `Upgrade` and `Connection` headers

### All agents show as busy but no tasks are running

The backend process may have crashed mid-task leaving in-memory state stale. Restart the backend:
```bash
pm2 restart openclaw-backend
```
Agent state is re-initialised from scratch on startup. Tasks in the database are preserved.

### Tasks fail immediately

Check `pm2 logs openclaw-backend` for the error. Common causes:
- **Invalid API key**: Check `ANTHROPIC_API_KEY` in `.env`
- **Rate limit exceeded**: The context window is capped at 8,000 tokens; if you are hitting rate limits, check your Anthropic plan
- **open-interpreter not installed**: Run `pip install open-interpreter` inside the venv

### Telegram bot not responding

- Confirm `TELEGRAM_BOT_TOKEN` is set correctly in `.env`
- Check logs: `pm2 logs openclaw-backend | grep -i telegram`
- Ensure the bot was started with `/start` in the Telegram chat before sending commands

### Version mismatch

If `curl http://YOUR_IP/api/version` returns an unexpected version:
```bash
cd /opt/openclaw-factory
git pull
pm2 restart all
```

### Port 80 not accessible

Check the firewall:
```bash
ufw status
ufw allow 80
```

---

*OpenClawFactory v0.33 — https://github.com/westland/OpenClawFactory*
