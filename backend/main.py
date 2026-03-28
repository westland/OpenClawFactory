"""
OpenClawFactory — Backend API
FastAPI + WebSockets. Runs on port 8000.

Usage:
  python main.py              # start API server
  python main.py --no-telegram
"""
import asyncio
import json
import logging
import logging.handlers
import sys
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))

from agents.manager import AgentManager
from core.config import load_config
from core.state import state

# ---- Logging ----
Path("../logs").mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.handlers.RotatingFileHandler(
            "../logs/backend.log", maxBytes=5_000_000, backupCount=2
        ),
    ],
)
logger = logging.getLogger(__name__)

# ---- App init ----
config = load_config()
agent_manager = AgentManager(config)

APP_VERSION = "0.33"

app = FastAPI(title="OpenClawFactory API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- WebSocket connection manager ----
class ConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self._connections.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self._connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.remove(ws)

ws_manager = ConnectionManager()

# Store the event loop once uvicorn starts so agent threads can post to it.
_event_loop: asyncio.AbstractEventLoop | None = None

@app.on_event("startup")
async def _capture_loop():
    global _event_loop
    _event_loop = asyncio.get_running_loop()

def _sync_broadcast(event: dict):
    """Called from agent threads — schedules a coroutine on the event loop."""
    if _event_loop is None or not _event_loop.is_running():
        return
    try:
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast(event), _event_loop)
    except Exception as e:
        logger.debug(f"Broadcast skipped: {e}")

state.set_broadcast(_sync_broadcast)

# ---- Routes ----

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/version")
def version():
    return {"version": APP_VERSION}

@app.get("/api/agents")
def get_agents():
    return {"agents": agent_manager.get_agents()}

@app.get("/api/tasks")
def get_tasks(limit: int = 20):
    return {"tasks": state.get_tasks(limit)}

@app.delete("/api/tasks")
def clear_tasks():
    deleted = state.clear_tasks()
    return {"deleted": deleted}

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    task = state.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    messages = state.get_messages(task_id)
    return {"task": task, "messages": messages}

class AssignRequest(BaseModel):
    title: str
    description: str = ""
    agent: str = ""          # leave blank for auto-assign

@app.post("/api/tasks")
def assign_task(req: AssignRequest):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="title is required")
    try:
        result = agent_manager.assign_task(req.title, req.description, req.agent)
        return result
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=409, detail=str(e))

@app.get("/api/stages")
def get_stages():
    from core.state import STAGES
    return {"stages": STAGES}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    # Send current state immediately on connect
    await ws.send_json({
        "type": "init",
        "data": {
            "agents": agent_manager.get_agents(),
            "tasks": state.get_tasks(10),
        }
    })
    try:
        while True:
            await ws.receive_text()   # keep alive; client can send pings
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

# ---- Entry point ----
if __name__ == "__main__":
    import threading
    no_telegram = "--no-telegram" in sys.argv

    # Telegram's run_polling() manages its own event loop and conflicts with
    # uvicorn's loop when gathered together. Run it in a dedicated thread instead.
    if not no_telegram and config.telegram_bot_token:
        def _run_telegram():
            import asyncio as _asyncio
            from delivery.telegram_bot import start_telegram_bot
            loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(start_telegram_bot(config, agent_manager))
            finally:
                loop.close()
        threading.Thread(target=_run_telegram, daemon=True).start()

    logger.info(f"OpenClawFactory backend starting on port {config.backend_port}")
    uvicorn.run(app, host=config.backend_host, port=config.backend_port, log_level="warning")
