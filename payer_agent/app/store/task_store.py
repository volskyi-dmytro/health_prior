"""Thread-safe async in-memory task store."""
import asyncio
from typing import Optional

from app.models.a2a import Task


class TaskStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._tasks: dict[str, Task] = {}

    async def create(self, task: Task) -> Task:
        async with self._lock:
            self._tasks[task.id] = task
        return task

    async def get(self, task_id: str) -> Optional[Task]:
        async with self._lock:
            return self._tasks.get(task_id)

    async def update(self, task: Task) -> Task:
        async with self._lock:
            self._tasks[task.id] = task
        return task


# Module-level singleton shared across the process
task_store = TaskStore()
