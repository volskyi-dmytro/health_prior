#!/usr/bin/env python3
"""
Run once to parse a Molina clinical policy PDF and write structured criteria JSON.
Usage: python scripts/ingest_policy.py --pdf path/to/Lumbar_Spine_MRI.pdf --policy MCR-621
"""
import asyncio
import argparse
import json
import sys
from pathlib import Path

import pdfplumber

# Allow running from backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.llm_service import LLMService
from app.core.config import settings

SYSTEM_PROMPT = """You are a clinical policy analyst. Extract all coverage criteria from the following Molina Healthcare clinical review policy.

Return a JSON object with this exact schema:
{
  "policy_id": "MCR-621",
  "policy_name": "...",
  "procedure": { "cpt_code": "...", "description": "..." },
  "coverage_criteria": [
    {
      "id": "criteria_slug",
      "category": "chronic_pain | neurological | trauma | tumor | infection | other",
      "description": "plain-English description",
      "keywords": ["list", "of", "trigger", "words"],
      "required_duration_weeks": null or integer,
      "icd10_codes": ["M54.5", ...]
    }
  ],
  "exclusion_criteria": [
    { "id": "...", "description": "...", "keywords": [...] }
  ],
  "notes": "any important policy notes or limitations"
}

Return only valid JSON, no markdown."""


async def main(pdf_path: str, policy_id: str):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() for p in pdf.pages if p.extract_text())

    if not text.strip():
        print("ERROR: Could not extract text from PDF", file=sys.stderr)
        sys.exit(1)

    llm = LLMService(api_key=settings.OPENROUTER_API_KEY)
    result_str = await llm.complete(system=SYSTEM_PROMPT, user=text)

    criteria = json.loads(result_str)
    out_path = Path(__file__).parent.parent / "app" / "data" / f"{policy_id.lower().replace('-', '_')}_criteria.json"
    out_path.write_text(json.dumps(criteria, indent=2))
    print(f"Written to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a Molina policy PDF into structured JSON.")
    parser.add_argument("--pdf", required=True, help="Path to the policy PDF file")
    parser.add_argument("--policy", default="MCR-621", help="Policy ID (e.g. MCR-621)")
    args = parser.parse_args()
    asyncio.run(main(args.pdf, args.policy))
