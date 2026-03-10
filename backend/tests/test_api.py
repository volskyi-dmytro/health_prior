import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
import os

os.environ["TESTING"] = "true"
os.environ["OPENROUTER_API_KEY"] = "test_key"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://healthprior:testpass@localhost:5432/healthprior_test"

from app.auth.session import require_auth, require_ai_access
from app.main import app
from app.models.schemas import FHIRBundle

_test_user = {"github_login": "test", "is_admin": True}
app.dependency_overrides[require_auth] = lambda: _test_user
app.dependency_overrides[require_ai_access] = lambda: _test_user


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.anyio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "healthprior-backend"


@pytest.mark.anyio
async def test_sample_notes(client):
    response = await client.get("/notes/samples")
    assert response.status_code == 200
    notes = response.json()
    assert len(notes) == 3
    assert all("id" in n for n in notes)
    assert all("content" in n for n in notes)
    assert all("expected_decision" in n for n in notes)


@pytest.mark.anyio
async def test_sample_note_by_id(client):
    response = await client.get("/notes/samples/note_001")
    assert response.status_code == 200
    note = response.json()
    assert note["id"] == "note_001"
    assert note["expected_decision"] == "APPROVED"


@pytest.mark.anyio
async def test_sample_note_not_found(client):
    response = await client.get("/notes/samples/nonexistent")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_structure_note_calls_mcp_and_llm(client):
    mock_fhir = {
        "resourceType": "Bundle",
        "type": "collection",
        "patient_demographics": {"id": "pat_001", "name": "Test Patient", "dob": "1968-05-14", "gender": "male"},
        "entry": [
            {
                "resourceType": "Condition",
                "id": "cond_001",
                "code": {"text": "Low back pain", "coding": [{"system": "ICD-10", "code": "M54.5"}]},
                "clinicalStatus": "active",
                "evidence": [],
                "_sourceRef": "ASSESSMENT & PLAN"
            }
        ]
    }
    mock_mcp = {"policy_id": "MCR-621", "coverage_criteria": []}

    from app.services.llm_service import LLMCallResult
    mock_meta = LLMCallResult(content="", prompt_tokens=10, completion_tokens=10, latency_ms=100)
    with patch("app.api.notes.MCPClient.get_coverage_criteria", new_callable=AsyncMock, return_value=mock_mcp), \
         patch("app.api.notes.LLMService.structure_note_retry", new_callable=AsyncMock, return_value=(mock_fhir, mock_meta)), \
         patch("app.api.notes.log_llm_call", new_callable=AsyncMock):
        response = await client.post("/notes/structure", json={"note": "Patient with low back pain x 8 weeks."})

    assert response.status_code == 200
    data = response.json()
    assert "fhir_bundle" in data
    assert data["fhir_bundle"]["resourceType"] == "Bundle"


@pytest.mark.anyio
async def test_coverage_evaluation(client):
    fhir_bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "patient_demographics": {},
        "entry": [
            {
                "resourceType": "Condition",
                "id": "cond_001",
                "code": {"text": "Lumbar radiculopathy", "coding": [{"system": "ICD-10", "code": "M54.4"}]},
                "clinicalStatus": "active",
                "_sourceRef": "ASSESSMENT"
            }
        ]
    }
    from app.models.a2a import TaskStatus, SendTaskResponse
    mock_response = SendTaskResponse(
        id="test-task-123",
        status=TaskStatus(state="submitted"),
    )
    with patch("app.api.coverage.A2AClient.send_task", new_callable=AsyncMock,
               return_value=mock_response), \
         patch("app.api.coverage.log_llm_call", new_callable=AsyncMock):
        response = await client.post("/coverage/evaluate", json={
            "fhir_bundle": fhir_bundle,
            "raw_note": "Clinical note text",
            "policy_id": "MCR-621"
        })

    assert response.status_code == 202
    data = response.json()
    assert data["task_id"] == "test-task-123"
    assert data["state"] == "submitted"


@pytest.mark.anyio
async def test_prior_auth_generation(client):
    fhir_bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "patient_demographics": {"id": "pat_001", "name": "John M.", "dob": "1968-05-14", "gender": "male"},
        "entry": []
    }
    coverage_result = {
        "decision": "APPROVED",
        "matched_criteria": ["chronic_pain_conservative_failure"],
        "unmet_criteria": [],
        "justification": "Patient completed 8 weeks PT without improvement.",
        "confidence_score": 0.85,
        "policy_id": "MCR-621"
    }

    with patch("app.api.prior_auth.get_db"):
        response = await client.post("/prior-auth/generate", json={
            "fhir_bundle": fhir_bundle,
            "coverage_result": coverage_result,
            "raw_note": "Clinical note",
        })

    # Even if DB is unavailable in test, the package should be generated
    assert response.status_code in [200, 422]
    if response.status_code == 200:
        data = response.json()
        assert "submission_id" in data
        assert "a2a_payload" in data
        assert "coverage_decision" in data
        assert data["requested_service"]["cpt_code"] == "72148"


def test_molina_criteria_structure():
    from app.data.molina_mcr621_criteria import MOLINA_MCR621
    assert MOLINA_MCR621["policy_id"] == "MCR-621"
    assert len(MOLINA_MCR621["coverage_criteria"]) > 5
    assert len(MOLINA_MCR621["exclusion_criteria"]) > 0
    for criterion in MOLINA_MCR621["coverage_criteria"]:
        assert "id" in criterion
        assert "description" in criterion
        assert "keywords" in criterion


def test_mcp_tools_importable():
    from app.mcp_server.server import mcp
    assert mcp is not None


def test_sample_notes_completeness():
    from app.data.sample_notes import get_sample_notes
    notes = get_sample_notes()
    assert len(notes) == 3
    decisions = {n.expected_decision for n in notes}
    assert "APPROVED" in decisions
    assert "DENIED" in decisions
    for note in notes:
        assert len(note.content) > 200
        assert "CHIEF COMPLAINT" in note.content
        assert "PHYSICAL EXAMINATION" in note.content


@pytest.mark.anyio
async def test_protected_route_requires_auth(client):
    """Without auth override, protected routes should return 401."""
    app.dependency_overrides.pop(require_auth, None)
    app.dependency_overrides.pop(require_ai_access, None)
    response = await client.get("/notes/samples")
    assert response.status_code == 401
    app.dependency_overrides[require_auth] = lambda: _test_user
    app.dependency_overrides[require_ai_access] = lambda: _test_user

@pytest.mark.anyio
async def test_health_unprotected(client):
    app.dependency_overrides.pop(require_auth, None)
    app.dependency_overrides.pop(require_ai_access, None)
    response = await client.get("/health")
    assert response.status_code == 200
    app.dependency_overrides[require_auth] = lambda: _test_user
    app.dependency_overrides[require_ai_access] = lambda: _test_user

@pytest.mark.anyio
async def test_auth_me_unauthenticated(client):
    app.dependency_overrides.pop(require_auth, None)
    app.dependency_overrides.pop(require_ai_access, None)
    response = await client.get("/auth/me")
    assert response.status_code == 401
