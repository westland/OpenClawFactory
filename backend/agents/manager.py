"""
Agent Manager — owns all AgentRunner instances, assigns tasks,
and provides a clean interface for the API layer.
"""
import logging

from agents.runner import AgentRunner
from core.config import Config
from core.state import state

logger = logging.getLogger(__name__)


class AgentManager:
    def __init__(self, config: Config):
        self._config = config
        self._runners: dict[str, AgentRunner] = {}

        for persona in config.agents:
            runner = AgentRunner(persona, config)
            self._runners[persona.name] = runner
            state.register_agent(persona.name, persona.role, persona.model)
            state.move_agent(persona.name, "breakroom")

        logger.info(f"AgentManager: {len(self._runners)} agents registered: "
                    f"{list(self._runners.keys())}")

    def assign_task(self, task_title: str, task_description: str = "",
                    agent_name: str = "") -> dict:
        """
        Assign a task to a named agent (or auto-pick the first idle one).
        Returns {"task_id": ..., "agent": ...}.
        """
        runner = None

        if agent_name:
            runner = self._runners.get(agent_name)
            if runner is None:
                raise ValueError(f"Unknown agent: {agent_name!r}")
            if runner.is_busy:
                raise RuntimeError(f"{agent_name} is busy. Choose another agent.")
        else:
            # Auto-assign to first idle agent
            for r in self._runners.values():
                if not r.is_busy:
                    runner = r
                    break
            if runner is None:
                raise RuntimeError("All agents are currently busy.")

        task_id = runner.assign(task_title, task_description)
        return {"task_id": task_id, "agent": runner.name}

    def get_agents(self) -> list[dict]:
        agents = state.get_agents()
        # Annotate with busy flag
        for a in agents:
            r = self._runners.get(a["name"])
            a["busy"] = r.is_busy if r else False
        return agents

    def get_runner(self, name: str) -> AgentRunner | None:
        return self._runners.get(name)
