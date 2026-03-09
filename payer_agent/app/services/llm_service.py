"""OpenRouter LLM client — adapted from backend with no DB dependency."""
import asyncio
import json
import time
from typing import Any

import httpx

from app.core.config import settings

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

COVERAGE_EVALUATION_SYSTEM = """You are a prior authorization clinical reviewer. Compare patient FHIR clinical data against Molina Healthcare MCR-621 coverage criteria for Lumbar Spine MRI.

You will receive:
1. A FHIR bundle of patient clinical data
2. The Molina MCR-621 coverage criteria

Analyze each criterion and determine if the patient's clinical data supports it.

Return a JSON object:
{
  "decision": "APPROVED" | "DENIED" | "NEEDS_MORE_INFO",
  "matched_criteria": ["list of criterion IDs that are met"],
  "unmet_criteria": ["list of criterion IDs checked but not met"],
  "justification": "A 2-3 paragraph clinical justification referencing specific findings from the note. Be specific about which findings support or contradict approval.",
  "confidence_score": 0.0-1.0
}

Confidence score calibration — use the FULL range, not just high values:
- 0.90–1.00: All criteria clearly met/unmet with explicit, unambiguous documentation
- 0.75–0.89: Most criteria well-supported but minor documentation gaps or ambiguity
- 0.55–0.74: Moderate evidence; some criteria inferred rather than explicitly documented
- 0.40–0.54: Significant ambiguity; key information is missing or contradictory
- 0.00–0.39: Very poor evidence; cannot reliably determine coverage without more info

Decision rules:
- APPROVED: Patient meets at least ONE coverage criterion
- DENIED: Patient meets NO coverage criteria AND has exclusion criteria (acute uncomplicated pain without neurological findings, no conservative therapy trial)
- NEEDS_MORE_INFO: Unclear clinical picture, missing key information

Return ONLY valid JSON."""

QUESTION_GENERATION_SYSTEM = """You are a payer coverage analyst. Given this coverage evaluation result, generate one specific clinical question that, if answered, would most likely change the determination. Return JSON: {"question": "...", "criterion_at_stake": "..."}"""

FOLLOWUP_EVALUATION_SYSTEM = """You are a prior authorization clinical reviewer re-evaluating a coverage request.

You will receive:
1. The original FHIR bundle
2. The Molina MCR-621 coverage criteria
3. A conversation history of clarifying questions and answers

Using ALL available information (FHIR data + conversation answers), re-evaluate the coverage request.

Return a JSON object:
{
  "decision": "APPROVED" | "DENIED" | "NEEDS_MORE_INFO",
  "matched_criteria": ["list of criterion IDs that are met"],
  "unmet_criteria": ["list of criterion IDs checked but not met"],
  "justification": "A 2-3 paragraph clinical justification referencing specific findings from the note and conversation answers.",
  "confidence_score": 0.0-1.0
}

Confidence score calibration — use the FULL range, not just high values:
- 0.90–1.00: All criteria clearly met/unmet with explicit, unambiguous documentation
- 0.75–0.89: Most criteria well-supported but minor documentation gaps or ambiguity
- 0.55–0.74: Moderate evidence; some criteria inferred rather than explicitly documented
- 0.40–0.54: Significant ambiguity; key information is missing or contradictory
- 0.00–0.39: Very poor evidence; cannot reliably determine coverage without more info

Return ONLY valid JSON."""


class LLMCallResult:
    def __init__(
        self,
        content: str,
        prompt_tokens: int | None,
        completion_tokens: int | None,
        latency_ms: int,
    ) -> None:
        self.content = content
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.latency_ms = latency_ms


class LLMService:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.DEFAULT_MODEL

    async def complete_with_meta(
        self, system: str, user: str, retries: int = 3
    ) -> LLMCallResult:
        """Call OpenRouter LLM with exponential-backoff retry on rate limit."""
        for attempt in range(retries):
            t0 = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{OPENROUTER_BASE}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "HTTP-Referer": "https://healthprior.volskyi-dmytro.com",
                            "X-Title": "HealthPrior",
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": system},
                                {"role": "user", "content": user},
                            ],
                            "temperature": 0.1,
                            "max_tokens": 4096,
                        },
                    )
                    response.raise_for_status()
                    latency_ms = int((time.monotonic() - t0) * 1000)
                    data = response.json()
                    usage = data.get("usage", {})
                    return LLMCallResult(
                        content=data["choices"][0]["message"]["content"],
                        prompt_tokens=usage.get("prompt_tokens"),
                        completion_tokens=usage.get("completion_tokens"),
                        latency_ms=latency_ms,
                    )
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < retries - 1:
                    await asyncio.sleep(2**attempt)
                    continue
                raise

        raise RuntimeError("LLM service failed after retries")

    async def complete(self, system: str, user: str, retries: int = 3) -> str:
        result = await self.complete_with_meta(system, user, retries)
        return result.content

    def parse_json(self, raw: str) -> dict[str, Any]:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip(), strict=False)
