import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.models.a2a import (
    SendTaskRequest,
    SendTaskResponse,
    Task,
    Message,
    DataPart,
    TextPart,
)


class A2AClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.PAYER_AGENT_URL

    async def get_agent_card(self) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                r = await client.get(f"{self.base_url}/.well-known/agent.json")
                r.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=f"Payer agent returned {exc.response.status_code} for agent card",
                ) from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not reach payer agent: {exc}",
                ) from exc
            return r.json()

    async def send_task(
        self,
        fhir_bundle: dict,
        policy_id: str,
        session_id: str | None = None,
        task_id: str | None = None,
    ) -> SendTaskResponse:
        payload = SendTaskRequest(
            **({"id": task_id} if task_id else {}),
            session_id=session_id,
            message=Message(
                role="user",
                parts=[DataPart(data=fhir_bundle)],
                metadata={"policy_id": policy_id},
            ),
        )
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                r = await client.post(
                    f"{self.base_url}/tasks/send",
                    json=payload.model_dump(mode="json"),
                )
                r.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=f"Payer agent rejected task submission: {exc.response.text}",
                ) from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not reach payer agent: {exc}",
                ) from exc
            return SendTaskResponse(**r.json())

    async def get_task(self, task_id: str) -> Task:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                r = await client.get(f"{self.base_url}/tasks/{task_id}")
                r.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 404:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Task {task_id} not found in payer agent",
                    ) from exc
                raise HTTPException(
                    status_code=status,
                    detail=f"Payer agent error fetching task: {exc.response.text}",
                ) from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not reach payer agent: {exc}",
                ) from exc
            return Task(**r.json())

    async def reply_to_task(self, task_id: str, answer_text: str) -> Task:
        msg = Message(role="user", parts=[TextPart(text=answer_text)])
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                r = await client.post(
                    f"{self.base_url}/tasks/{task_id}/send",
                    json={"message": msg.model_dump(mode="json")},
                )
                r.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 404:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Task {task_id} not found in payer agent",
                    ) from exc
                raise HTTPException(
                    status_code=status,
                    detail=f"Payer agent error on task reply: {exc.response.text}",
                ) from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not reach payer agent: {exc}",
                ) from exc
            return Task(**r.json())
