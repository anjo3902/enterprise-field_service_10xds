"""
app/ai/autonomous/schedulers/async_scheduler.py
─────────────────────────────────────────────────────────────────────────────
Async scheduler running continuous background tasks (Watchers).
"""
import asyncio
import time
from typing import Callable, Dict, List
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.scheduler")

class Job:
    def __init__(self, name: str, func: Callable, interval_seconds: int):
        self.name = name
        self.func = func
        self.interval = interval_seconds
        self.is_running = False
        self._task = None

    async def run(self):
        self.is_running = True
        logger.info(f"Watcher job '{self.name}' started. Interval: {self.interval}s")
        while self.is_running:
            try:
                await self.func()
            except Exception as e:
                logger.error(f"Error in job '{self.name}': {e}")
            await asyncio.sleep(self.interval)

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info(f"Watcher job '{self.name}' stopped.")


class AsyncScheduler:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}

    def add_job(self, name: str, func: Callable, interval_seconds: int):
        self.jobs[name] = Job(name, func, interval_seconds)

    def start_all(self):
        loop = asyncio.get_event_loop()
        for name, job in self.jobs.items():
            if not job.is_running:
                job._task = loop.create_task(job.run())

    def stop_all(self):
        for job in self.jobs.values():
            job.stop()

# Global scheduler instance
scheduler = AsyncScheduler()
