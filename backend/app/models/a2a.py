from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal, Union, Any, Annotated
from datetime import datetime
import uuid


class TextPart(BaseModel):
    type: Literal["text"] = "text"
    text: str


class DataPart(BaseModel):
    type: Literal["data"] = "data"
    mime_type: str = "application/fhir+json"
    data: dict[str, Any]


class FilePart(BaseModel):
    type: Literal["file"] = "file"
    uri: str
    mime_type: str = "application/pdf"


Part = Annotated[Union[TextPart, DataPart, FilePart], Field(discriminator="type")]


class Message(BaseModel):
    role: Literal["user", "agent"]
    parts: list[Part]
    metadata: dict[str, Any] = Field(default_factory=dict)


TaskState = Literal["submitted", "working", "input-required", "completed", "failed", "canceled"]


class TaskStatus(BaseModel):
    state: TaskState
    message: Message | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str | None = None
    status: TaskStatus
    history: list[Message] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SendTaskRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str | None = None
    message: Message
    metadata: dict[str, Any] = Field(default_factory=dict)


class SendTaskResponse(BaseModel):
    id: str
    status: TaskStatus
