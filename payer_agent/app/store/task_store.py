"""Async task store — SQLite-backed when aiosqlite is available, in-memory fallback."""
import asyncio
import time
from pathlib import Path
from typing import Optional

from app.models.a2a import Task

try:
    import aiosqlite
    _AIOSQLITE_AVAILABLE = True
except ImportError:
    _AIOSQLITE_AVAILABLE = False

_DB_PATH = "/data/tasks.db" if Path("/data").exists() else "./tasks.db"


class TaskStore:
    def __init__(self, db_path: str = _DB_PATH) -> None:
        self._db_path = db_path
        self._db = None
        self._lock = asyncio.Lock()
        self._memory: dict[str, Task] = {}

    async def initialize(self) -> None:
        if not _AIOSQLITE_AVAILABLE:
            return  # use in-memory fallback silently
        self._db = await aiosqlite.connect(self._db_path)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute(
            """CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at REAL NOT NULL
            )"""
        )
        await self._db.commit()

    async def create(self, task: Task) -> Task:
        if self._db is not None:
            await self._db.execute(
                "INSERT INTO tasks (id, data, updated_at) VALUES (?, ?, ?)",
                (task.id, task.model_dump_json(), time.time()),
            )
            await self._db.commit()
        else:
            async with self._lock:
                self._memory[task.id] = task
        return task

    async def get(self, task_id: str) -> Optional[Task]:
        if self._db is not None:
            async with self._db.execute("SELECT data FROM tasks WHERE id = ?", (task_id,)) as cursor:
                row = await cursor.fetchone()
            if row is None:
                return None
            return Task.model_validate_json(row["data"])
        else:
            async with self._lock:
                return self._memory.get(task_id)

    async def update(self, task: Task) -> Task:
        if self._db is not None:
            await self._db.execute(
                "UPDATE tasks SET data = ?, updated_at = ? WHERE id = ?",
                (task.model_dump_json(), time.time(), task.id),
            )
            await self._db.commit()
        else:
            async with self._lock:
                self._memory[task.id] = task
        return task


# Module-level singleton shared across the process
task_store = TaskStore()
