"""
Shared in-memory + SQLite state for all agents and tasks.
All mutations go through StateManager to ensure WebSocket broadcasts.
"""
import asyncio
import json
import sqlite3
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = ROOT / "data" / "factory.db"

STAGES = ["breakroom", "briefing", "research", "build", "qa", "ship"]

_SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    agent_name   TEXT,
    stage        TEXT NOT NULL DEFAULT 'briefing',
    status       TEXT NOT NULL DEFAULT 'pending',
    result       TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    TEXT NOT NULL,
    agent_name TEXT,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


@dataclass
class AgentState:
    name: str
    role: str
    stage: str = "breakroom"
    task_id: str = ""
    task_title: str = ""
    model: str = "claude-sonnet-4-6"


@dataclass
class Task:
    id: str
    title: str
    description: str = ""
    agent_name: str = ""
    stage: str = "briefing"
    status: str = "pending"       # pending / running / completed / failed
    result: str = ""
    created_at: str = ""
    updated_at: str = ""


class StateManager:
    """
    Central state store. Fires broadcast_cb(event_dict) on every mutation
    so the WebSocket layer can push updates to all connected browsers.
    """

    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

        self._lock = threading.Lock()
        self._agents: dict[str, AgentState] = {}
        self._broadcast_cb: Callable | None = None

    # ---- Registration ----

    def register_agent(self, name: str, role: str, model: str):
        self._agents[name] = AgentState(name=name, role=role, model=model)

    def set_broadcast(self, cb: Callable):
        self._broadcast_cb = cb

    # ---- Agent stage updates ----

    def move_agent(self, name: str, stage: str, task_id: str = "", task_title: str = ""):
        if name not in self._agents:
            return
        self._agents[name].stage = stage
        self._agents[name].task_id = task_id
        self._agents[name].task_title = task_title
        self._fire("agent_moved", {
            "agent": name,
            "stage": stage,
            "task_id": task_id,
            "task_title": task_title,
        })

    def get_agents(self) -> list[dict]:
        return [asdict(a) for a in self._agents.values()]

    # ---- Task CRUD ----

    def create_task(self, task: Task) -> Task:
        now = datetime.utcnow().isoformat()
        task.created_at = now
        task.updated_at = now
        with self._lock:
            self._conn.execute(
                "INSERT INTO tasks (id,title,description,agent_name,stage,status,result,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (task.id, task.title, task.description, task.agent_name,
                 task.stage, task.status, task.result, now, now),
            )
            self._conn.commit()
        self._fire("task_created", asdict(task))
        return task

    def update_task(self, task_id: str, **kwargs):
        now = datetime.utcnow().isoformat()
        kwargs["updated_at"] = now
        sets = ", ".join(f"{k}=?" for k in kwargs)
        vals = list(kwargs.values()) + [task_id]
        with self._lock:
            self._conn.execute(f"UPDATE tasks SET {sets} WHERE id=?", vals)
            self._conn.commit()
        self._fire("task_updated", {"id": task_id, **kwargs})

    def get_tasks(self, limit: int = 30) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

    def clear_tasks(self, statuses: list[str] | None = None) -> int:
        """Delete tasks by status. Defaults to completed + failed."""
        if statuses is None:
            statuses = ["completed", "failed"]
        placeholders = ",".join("?" * len(statuses))
        with self._lock:
            cur = self._conn.execute(
                f"DELETE FROM tasks WHERE status IN ({placeholders})", statuses
            )
            self._conn.commit()
        return cur.rowcount

    def get_task(self, task_id: str) -> dict | None:
        row = self._conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return dict(row) if row else None

    # ---- Message log ----

    def log_message(self, task_id: str, agent_name: str, role: str, content: str):
        now = datetime.utcnow().isoformat()
        with self._lock:
            self._conn.execute(
                "INSERT INTO messages (task_id,agent_name,role,content,created_at) VALUES (?,?,?,?,?)",
                (task_id, agent_name, role, content[:4000], now),
            )
            self._conn.commit()
        self._fire("message", {
            "task_id": task_id, "agent": agent_name,
            "role": role, "content": content[:500],
            "created_at": now,
        })

    def get_messages(self, task_id: str) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM messages WHERE task_id=? ORDER BY created_at ASC", (task_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    # ---- Broadcast ----

    def _fire(self, event_type: str, data: dict):
        if self._broadcast_cb:
            self._broadcast_cb({"type": event_type, "data": data})


# Singleton
state = StateManager()
