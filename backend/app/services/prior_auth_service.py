import uuid
from datetime import datetime, timezone
from app.models.schemas import FHIRBundle, CoverageResult, PriorAuthPackage


class PriorAuthService:
    def generate(
        self,
        fhir_bundle: FHIRBundle,
        coverage_result: CoverageResult,
        raw_note: str,
        patient_id: str | None = None,
        submission_id: str | None = None,
    ) -> PriorAuthPackage:
        """Generate a complete prior auth package."""
        submission_id = submission_id or str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        # Extract patient info
        demo = fhir_bundle.patient_demographics
        patient = {
            "id": patient_id or demo.get("id", f"PAT-{uuid.uuid4().hex[:8].upper()}"),
            "name": demo.get("name", "Patient"),
            "dob": demo.get("dob", "Unknown"),
            "mrn": demo.get("mrn", ""),
            "gender": demo.get("gender", "unknown"),
        }

        # Extract ICD-10 codes from conditions
        icd10_codes = []
        for entry in fhir_bundle.entry:
            if entry.get("resourceType") == "Condition":
                for coding in entry.get("code", {}).get("coding", []):
                    if coding.get("code"):
                        icd10_codes.append(coding["code"])
        icd10_codes = list(set(icd10_codes)) or ["M54.5"]

        requested_service = {
            "cpt_code": "72148",
            "description": "MRI Lumbar Spine without contrast",
            "icd10_codes": icd10_codes,
            "procedure_name": "Lumbar Spine MRI",
            "payer_policy": "Molina Healthcare MCR-621",
        }

        # Build A2A / DaVinci PAS-style payload
        a2a_entries = [
            {
                "resource": {
                    "resourceType": "ServiceRequest",
                    "id": f"sr-{uuid.uuid4().hex[:8]}",
                    "status": "active",
                    "intent": "proposal",
                    "code": {
                        "coding": [{"system": "http://www.ama-assn.org/go/cpt", "code": "72148"}],
                        "text": "MRI Lumbar Spine without contrast",
                    },
                    "subject": {"reference": f"Patient/{patient['id']}"},
                    "reasonCode": [{"coding": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "code": c} for c in icd10_codes]}],
                }
            }
        ]
        # Add all FHIR resources to the A2A bundle
        for entry in fhir_bundle.entry:
            a2a_entries.append({"resource": entry})

        a2a_payload = {
            "resourceType": "Bundle",
            "id": f"pas-{uuid.uuid4().hex[:8]}",
            "type": "transaction",
            "timestamp": timestamp,
            "entry": a2a_entries,
        }

        return PriorAuthPackage(
            submission_id=submission_id,
            timestamp=timestamp,
            patient=patient,
            requested_service=requested_service,
            clinical_justification=coverage_result.justification,
            supporting_criteria=coverage_result.matched_criteria,
            coverage_decision=coverage_result.decision,
            fhir_bundle=fhir_bundle,
            a2a_payload=a2a_payload,
        )
