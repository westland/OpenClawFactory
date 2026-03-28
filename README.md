# OpenClawFactory

A multi-agent AI factory floor powered by [Open Interpreter](https://github.com/OpenInterpreter/open-interpreter), with a real-time Next.js Mission Control dashboard, WebSocket pipeline updates, and an optional Telegram bot interface.

```
  ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗██╗      █████╗ ██╗    ██╗
  ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║     ██╔══██╗██║    ██║
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║     ███████║██║ █╗ ██║
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║     ██╔══██║██║███╗██║
  ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗███████╗██║  ██║╚███╔███╔╝
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝
```

## What it does

- **Multi-agent factory**: Four named AI agents (Henry, Charlie, Sarah, Max) each backed by Open Interpreter, moving through pipeline stages: Break Room → Build → QA → Review → Ship
- **Mission Control dashboard**: Live Next.js UI showing agents as pixel-art sprites, animated between pipeline stages via WebSocket
- **Telegram bot**: Send tasks and check status from anywhere — `/assign`, `/status`, `/tasks`
- **PM2 + Nginx**: Production-grade process management on a DigitalOcean Droplet (or any Ubuntu server)

## Architecture

```
Browser / Phone
      │
   Nginx :80
    ├── /        → Next.js frontend  :3000
    ├── /api/*   → FastAPI backend   :8000
    └── /ws      → WebSocket         :8000
           │
    AgentManager
    ├── Henry  (Open Interpreter)
    ├── Charlie (Open Interpreter)
    ├── Sarah  (Open Interpreter)
    └── Max    (Open Interpreter)
           │
    SQLite (data/factory.db)
           │
    TelegramBot (optional)
```

## Quick start (DigitalOcean)

**One-time deploy from your local machine:**

```bash
git clone https://github.com/westland/OpenClawFactory
cd OpenClawFactory
bash deploy.sh root@YOUR_DROPLET_IP
```

The installer will prompt for:
- Anthropic API key (required)
- OpenAI API key (optional)
- Dashboard password
- Telegram bot token + chat ID (optional)

**Access:**
- Dashboard: `http://YOUR_DROPLET_IP`
- API: `http://YOUR_DROPLET_IP/api/agents`

## Local development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp ../.env.example ../.env  # fill in your keys
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Configuration

Edit `.env` to change agent names, roles, and models:

```env
AGENT_1_NAME=Henry
AGENT_1_ROLE=Researcher
AGENT_1_MODEL=claude-sonnet-4-6

AGENT_2_NAME=Charlie
AGENT_2_ROLE=Builder
AGENT_2_MODEL=claude-sonnet-4-6
```

Add up to 8 agents by continuing the `AGENT_N_*` pattern.

## PM2 commands (on server)

```bash
pm2 status          # view all processes
pm2 logs            # tail all logs
pm2 restart all     # restart everything
pm2 stop all        # stop everything
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| AI agents | Open Interpreter + Claude |
| Backend | FastAPI + uvicorn |
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion |
| Real-time | WebSocket |
| Database | SQLite |
| Process mgr | PM2 |
| Proxy | Nginx |
| Notifications | python-telegram-bot |

## License

MIT
