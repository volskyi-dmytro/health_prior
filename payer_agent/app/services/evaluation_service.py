"""LLM-based coverage evaluation for the payer agent."""
import json
import logging

from app.data.policy_loader import load_policy
from app.models.a2a import Message
from app.services.llm_service import (
    COVERAGE_EVALUATION_SYSTEM,
    FOLLOWUP_EVALUATION_SYSTEM,
    QUESTION_GENERATION_SYSTEM,
    LLMService,
)

logger = logging.getLogger(__name__)

# Cache loaded policies to avoid repeated disk I/O
_policy_cache: dict[str, dict] = {}


def _get_policy(policy_id: str) -> dict:
    if policy_id not in _policy_cache:
        try:
            _policy_cache[policy_id] = load_policy(policy_id)
        except FileNotFoundError:
            logger.warning("Policy %s not found — using empty criteria dict", policy_id)
            _policy_cache[policy_id] = {}
    return _policy_cache[policy_id]


def _build_history_text(history: list[Message]) -> str:
    """Render conversation history as readable text for inclusion in prompts."""
    lines: list[str] = []
    for msg in history:
        role_label = "AGENT QUESTION" if msg.role == "agent" else "USER ANSWER"
        for part in msg.parts:
            if hasattr(part, "text"):
                lines.append(f"{role_label}: {part.text}")
            elif hasattr(part, "data"):
                lines.append(f"{role_label}: {json.dumps(part.data)}")
    return "\n".join(lines)


async def evaluate(
    fhir_bundle: dict,
    policy_id: str,
    history: list[Message],
    llm_service: LLMService,
) -> dict:
    """Evaluate FHIR bundle against policy criteria.

    - When history is empty: initial evaluation.
    - When history contains prior Q&A turns: re-evaluate with full context.

    Returns one of:
      {"decision": "APPROVED" | "DENIED", ...CoverageResult fields...}
      {"decision": "NEEDS_MORE_INFO", "question": "...", "criterion_at_stake": "..."}
    """
    policy = _get_policy(policy_id)

    if not history:
        # Initial evaluation
        user_prompt = (
            f"Patient FHIR Bundle:\n{json.dumps(fhir_bundle, indent=2)}\n\n"
            f"Molina MCR-621 Coverage Criteria:\n{json.dumps(policy, indent=2)}\n\n"
            "Evaluate coverage and return JSON decision."
        )
        raw = await llm_service.complete(COVERAGE_EVALUATION_SYSTEM, user_prompt)
    else:
        # Re-evaluation with conversation history
        history_text = _build_history_text(history)
        user_prompt = (
            f"Original Patient FHIR Bundle:\n{json.dumps(fhir_bundle, indent=2)}\n\n"
            f"Molina MCR-621 Coverage Criteria:\n{json.dumps(policy, indent=2)}\n\n"
            f"Conversation History (clarifying Q&A):\n{history_text}\n\n"
            "Re-evaluate coverage using ALL available information and return JSON decision."
        )
        raw = await llm_service.complete(FOLLOWUP_EVALUATION_SYSTEM, user_prompt)

    result = llm_service.parse_json(raw)
    decision = result.get("decision", "NEEDS_MORE_INFO")

    if decision == "NEEDS_MORE_INFO":
        # Second LLM call: generate a specific clinical question
        question_prompt = (
            f"Coverage evaluation result:\n{json.dumps(result, indent=2)}\n\n"
            f"FHIR bundle summary:\n{json.dumps(fhir_bundle, indent=2)}"
        )
        question_raw = await llm_service.complete(QUESTION_GENERATION_SYSTEM, question_prompt)
        question_data = llm_service.parse_json(question_raw)
        return {
            "decision": "NEEDS_MORE_INFO",
            "question": question_data.get("question", "Please provide additional clinical information."),
            "criterion_at_stake": question_data.get("criterion_at_stake", ""),
            "matched_criteria": result.get("matched_criteria", []),
            "unmet_criteria": result.get("unmet_criteria", []),
            "justification": result.get("justification", ""),
            "confidence_score": float(result.get("confidence_score", 0.5)),
        }

    # APPROVED or DENIED — return full CoverageResult-compatible dict
    return {
        "decision": decision,
        "matched_criteria": result.get("matched_criteria", []),
        "unmet_criteria": result.get("unmet_criteria", []),
        "justification": result.get("justification", ""),
        "confidence_score": float(result.get("confidence_score", 0.5)),
        "policy_id": policy_id,
    }
