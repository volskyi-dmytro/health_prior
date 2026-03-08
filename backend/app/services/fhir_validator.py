"""
FHIR bundle validation layer.
Checks that all resources have the required fields, including _sourceRef.
"""

REQUIRED_FIELDS = {
    "Condition": ["resourceType", "code", "clinicalStatus", "_sourceRef"],
    "MedicationRequest": ["resourceType", "medication", "status", "_sourceRef"],
    "Observation": ["resourceType", "code", "valueString", "status", "_sourceRef"],
}


def validate_fhir_bundle(bundle: dict) -> tuple[bool, list[str]]:
    """
    Validate a FHIR bundle dict.

    Returns (is_valid, errors) where errors is a list of human-readable
    field-missing messages.
    """
    errors: list[str] = []
    for resource in bundle.get("entry", []):
        r_type = resource.get("resourceType")
        required = REQUIRED_FIELDS.get(r_type, [])
        for field in required:
            if field not in resource:
                errors.append(f"{r_type} missing required field: {field}")
    return len(errors) == 0, errors
