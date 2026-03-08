"""A2A protocol Pydantic v2 models."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Message parts — discriminated union on the `type` field
# ---------------------------------------------------------------------------

class TextPart(BaseModel):
    type: Literal["text"] = "text"
    text: str
    metadata: dict[str, Any] | None = None


class DataPart(BaseModel):
    type: Literal["data"] = "data"
    data: dict[str, Any]
    metadata: dict[str, Any] | None = None


class FilePart(BaseModel):
    type: Literal["file"] = "file"
    mime_type: str
    data: str  # base64-encoded content or a URL
    metadata: dict[str, Any] | None = None


Part = Annotated[
    Union[TextPart, DataPart, FilePart],
    Field(discriminator="type"),
]


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: Literal["user", "agent"]
    parts: list[Part]
    metadata: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Task lifecycle
# ---------------------------------------------------------------------------

TaskState = Literal["submitted", "working", "input-required", "completed", "failed", "canceled"]


class TaskStatus(BaseModel):
    state: TaskState
    message: Message | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Task(BaseModel):
    id: str
    session_id: str | None = None
    status: TaskStatus
    history: list[Message] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# AgentCard
# ---------------------------------------------------------------------------

class AgentCapabilities(BaseModel):
    streaming: bool = False
    push_notifications: bool = False
    state_transition_history: bool = True


class AgentSkill(BaseModel):
    id: str
    name: str
    description: str
    input_modes: list[str] = Field(default_factory=list)
    output_modes: list[str] = Field(default_factory=list)


class AgentCard(BaseModel):
    name: str
    description: str
    url: str
    version: str = "1.0.0"
    capabilities: AgentCapabilities = Field(default_factory=AgentCapabilities)
    skills: list[AgentSkill] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Request / Response shapes
# ---------------------------------------------------------------------------

class SendTaskRequest(BaseModel):
    id: str
    session_id: str | None = None
    message: Message
    metadata: dict[str, Any] | None = None


class SendTaskResponse(BaseModel):
    id: str
    status: TaskStatus


class TaskStatusUpdateEvent(BaseModel):
    id: str
    status: TaskStatus
    final: bool = False


class TaskContinueRequest(BaseModel):
    message: Message
