"""
Agent runner — wraps Open Interpreter for each persona.
Each agent runs in its own thread so multiple can work concurrently.
"""
import logging
import threading
import uuid
from datetime import datetime

from core.config import AgentPersona, Config
from core.state import Task, state

logger = logging.getLogger(__name__)


SYSTEM_PROMPTS = {
    "Researcher": """\
You are {name}, a sharp Research Agent. Your job is to find, verify, and summarise
information from the web. Be concise and cite sources. When research is done, output
a clean structured summary the team can act on. Always start with a one-line status:
"🔎 Researching: {task}" """,

    "Developer": """\
You are {name}, an expert Developer Agent. You write clean, tested Python/JavaScript/
bash code. Plan before you code. Add comments. Test your output. When done, show the
final code block and a one-line summary of what was built.
Always start with: "🔨 Building: {task}" """,

    "Analyst": """\
You are {name}, a Data Analyst Agent. You analyse data, spot trends, and produce
clear reports. Use tables and bullet points. Flag anomalies. Finish with 3 key
takeaways and a recommended next action.
Always start with: "📊 Analysing: {task}" """,

    "QA Engineer": """\
You are {name}, a QA Engineer Agent. You review code, logic, and outputs for bugs,
edge cases, security issues, and correctness. Provide a pass/fail verdict with
specific findings. Be thorough and precise.
Always start with: "✓ Reviewing: {task}" """,
}


def _get_system_prompt(role: str, name: str, task_title: str) -> str:
    template = SYSTEM_PROMPTS.get(role, "You are {name}, a helpful AI agent. Task: {task}")
    return template.format(name=name, task=task_title)


class AgentRunner:
    def __init__(self, persona: AgentPersona, config: Config):
        self.persona = persona
        self.config = config
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    @property
    def name(self):
        return self.persona.name

    @property
    def is_busy(self):
        return self._thread is not None and self._thread.is_alive()

    def assign(self, task_title: str, task_description: str = "") -> str:
        """Assign a task to this agent. Returns task_id."""
        if self.is_busy:
            raise RuntimeError(f"{self.name} is already working on a task.")

        task_id = datetime.utcnow().strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:6]
        task = Task(
            id=task_id,
            title=task_title,
            description=task_description,
            agent_name=self.name,
        )
        state.create_task(task)
        state.move_agent(self.name, "briefing", task_id, task_title)

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            args=(task_id, task_title, task_description),
            daemon=True,
            name=f"agent-{self.name}",
        )
        self._thread.start()
        return task_id

    def _run(self, task_id: str, task_title: str, task_description: str):
        try:
            self._execute(task_id, task_title, task_description)
        except Exception as exc:
            logger.error(f"{self.name} failed on task {task_id}: {exc}", exc_info=True)
            state.update_task(task_id, status="failed", result=str(exc))
            state.move_agent(self.name, "breakroom")
            state.log_message(task_id, self.name, "error", f"Task failed: {exc}")

    def _execute(self, task_id: str, task_title: str, task_description: str):
        state.update_task(task_id, status="running", stage="research")
        state.move_agent(self.name, "research", task_id, task_title)
        state.log_message(task_id, self.name, "assistant",
                          f"Starting work on: {task_title}")

        try:
            from interpreter import OpenInterpreter
            interp = OpenInterpreter()   # fresh instance — no shared history

            interp.llm.model = f"anthropic/{self.persona.model}"
            interp.llm.api_key = self.config.anthropic_api_key
            interp.llm.context_window = 8000   # keep well under 30k/min rate limit
            interp.llm.max_tokens = 1024
            interp.system_message = _get_system_prompt(
                self.persona.role, self.name, task_title
            )
            interp.auto_run = True        # runs code without asking
            interp.verbose = False

            prompt = task_title
            if task_description:
                prompt += f"\n\nAdditional context:\n{task_description}"

            state.move_agent(self.name, "build", task_id, task_title)
            state.update_task(task_id, stage="build")

            result_parts = []
            for chunk in interp.chat(prompt, stream=True, display=False):
                if self._stop_event.is_set():
                    break
                if chunk.get("type") == "message":
                    content = chunk.get("content", "")
                    if content:
                        result_parts.append(content)
                        state.log_message(task_id, self.name, "assistant", content)

            full_result = "".join(result_parts)

        except ImportError:
            # Open Interpreter not installed — simulate for testing
            logger.warning("open-interpreter not installed; running in simulation mode")
            import time
            state.log_message(task_id, self.name, "assistant",
                              f"[SIMULATION] Working on: {task_title}")
            time.sleep(3)
            full_result = f"[SIMULATION] Task '{task_title}' completed by {self.name}."

        state.move_agent(self.name, "qa", task_id, task_title)
        state.update_task(task_id, stage="qa")
        state.log_message(task_id, self.name, "assistant", "Reviewing output…")

        import time; time.sleep(1)

        state.move_agent(self.name, "ship", task_id, task_title)
        state.update_task(task_id, stage="ship", status="completed", result=full_result[:4000])
        state.log_message(task_id, self.name, "assistant", "✅ Task complete.")

        import time; time.sleep(2)
        state.move_agent(self.name, "breakroom")
