"""SQLite-backed persistent async task store."""
import time
from pathlib import Path
from typing import Optional

import aiosqlite

from app.models.a2a import Task

# Prefer the production volume mount; fall back to local directory when running outside Docker.
_DB_PATH = "/data/tasks.db" if Path("/data").exists() else "./tasks.db"


class TaskStore:
    def __init__(self, db_path: str = _DB_PATH) -> None:
        self._db_path = db_path
        self._db: aiosqlite.Connection | None = None

    async def initialize(self) -> None:
        """Open the SQLite connection and create the tasks table if needed."""
        self._db = await aiosqlite.connect(self._db_path)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id         TEXT PRIMARY KEY,
                data       TEXT NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        await self._db.commit()

    async def create(self, task: Task) -> Task:
        assert self._db is not None, "TaskStore not initialized — call await task_store.initialize() first"
        await self._db.execute(
            "INSERT INTO tasks (id, data, updated_at) VALUES (?, ?, ?)",
            (task.id, task.model_dump_json(), time.time()),
        )
        await self._db.commit()
        return task

    async def get(self, task_id: str) -> Optional[Task]:
        assert self._db is not None, "TaskStore not initialized — call await task_store.initialize() first"
        async with self._db.execute(
            "SELECT data FROM tasks WHERE id = ?", (task_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if row is None:
            return None
        return Task.model_validate_json(row["data"])

    async def update(self, task: Task) -> Task:
        assert self._db is not None, "TaskStore not initialized — call await task_store.initialize() first"
        await self._db.execute(
            "UPDATE tasks SET data = ?, updated_at = ? WHERE id = ?",
            (task.model_dump_json(), time.time(), task.id),
        )
        await self._db.commit()
        return task


# Module-level singleton shared across the process
task_store = TaskStore()
