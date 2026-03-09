"""
Audit log helpers — write a row to audit_log for every LLM call.

session_id: the frontend wizard UUID passed through all three API calls.
            Written to the session_id column (no FK) so rows survive before
            a prior_auth_submission row exists.

submission_id: the prior_auth_submissions PK — only set after the submission
               row is created (in prior_auth/generate). Earlier rows are
               backfilled by an UPDATE in that endpoint.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json


async def log_llm_call(
    db: AsyncSession,
    event_type: str,
    model_used: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    latency_ms: int | None = None,
    mcp_tools_called: list | None = None,
    submission_id: str | None = None,
    session_id: str | None = None,
) -> None:
    """Insert a single row into audit_log. Non-fatal — errors are swallowed."""
    try:
        await db.execute(
            text("""
                INSERT INTO audit_log
                    (id, submission_id, session_id, event_type, model_used, prompt_tokens,
                     completion_tokens, latency_ms, mcp_tools_called)
                VALUES
                    (:id, :submission_id, :session_id, :event_type, :model_used, :prompt_tokens,
                     :completion_tokens, :latency_ms, :mcp_tools_called::jsonb)
            """),
            {
                "id": str(uuid.uuid4()),
                "submission_id": submission_id,  # NULL for early wizard steps; backfilled later
                "session_id": session_id,
                "event_type": event_type,
                "model_used": model_used,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
                "mcp_tools_called": json.dumps(mcp_tools_called or []),
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()
