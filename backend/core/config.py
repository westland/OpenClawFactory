"""
OpenClawFactory — configuration loader.
Reads .env from the project root and exposes a typed Config object.
"""
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT / ".env")


@dataclass
class AgentPersona:
    name: str
    role: str
    model: str = "claude-sonnet-4-6"


@dataclass
class Config:
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    backend_port: int = 8000
    backend_host: str = "0.0.0.0"
    dashboard_password: str = "changeme"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    agents: list[AgentPersona] = field(default_factory=list)


def load_config() -> Config:
    agents = []
    i = 1
    while os.getenv(f"AGENT_{i}_NAME"):
        agents.append(AgentPersona(
            name=os.getenv(f"AGENT_{i}_NAME", f"Agent{i}"),
            role=os.getenv(f"AGENT_{i}_ROLE", "Assistant"),
            model=os.getenv(f"AGENT_{i}_MODEL", "claude-sonnet-4-6"),
        ))
        i += 1

    # Default agents if none configured
    if not agents:
        agents = [
            AgentPersona("Henry",  "Researcher",   "claude-sonnet-4-6"),
            AgentPersona("Charlie","Developer",    "claude-sonnet-4-6"),
            AgentPersona("Sarah",  "Analyst",      "claude-sonnet-4-6"),
            AgentPersona("Max",    "QA Engineer",  "claude-sonnet-4-6"),
        ]

    return Config(
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        backend_port=int(os.getenv("BACKEND_PORT", "8000")),
        backend_host=os.getenv("BACKEND_HOST", "0.0.0.0"),
        dashboard_password=os.getenv("DASHBOARD_PASSWORD", "changeme"),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID", ""),
        agents=agents,
    )
