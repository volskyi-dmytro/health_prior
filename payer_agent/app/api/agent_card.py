from fastapi import APIRouter

from app.core.config import settings
from app.models.a2a import AgentCapabilities, AgentCard, AgentSkill

router = APIRouter()


@router.get("/.well-known/agent.json", response_model=AgentCard)
async def get_agent_card() -> AgentCard:
    return AgentCard(
        name="HealthPrior Payer Agent",
        description="Molina MCR-621 prior authorization coverage evaluator — A2A compliant",
        url=settings.PAYER_AGENT_URL,
        capabilities=AgentCapabilities(streaming=True),
        skills=[
            AgentSkill(
                id="evaluate_mcr621",
                name="Evaluate MCR-621 Coverage",
                description=(
                    "Accepts FHIR R4 bundle DataPart, returns APPROVED/DENIED "
                    "with input-required loop for NEEDS_MORE_INFO"
                ),
                input_modes=["data"],
                output_modes=["data", "text"],
            )
        ],
    )
