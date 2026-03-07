"""
Molina Healthcare Clinical Review Criteria — MCR-621
Lumbar Spine MRI Coverage Criteria (from policy knowledge)
"""

MOLINA_MCR621 = {
    "policy_id": "MCR-621",
    "policy_name": "Lumbar Spine MRI",
    "procedure": {
        "cpt_codes": ["72148", "72149", "72158"],
        "description": "MRI Lumbar Spine without and/or with contrast"
    },
    "coverage_criteria": [
        {
            "id": "chronic_pain_conservative_failure",
            "category": "chronic_pain",
            "description": "Low back pain persisting >=6 weeks despite conservative therapy (physical therapy, chiropractic, NSAID/analgesic treatment)",
            "keywords": ["conservative therapy", "physical therapy", "PT", "6 weeks", "persistent", "failed conservative", "NSAID", "chiropractic"],
            "required_duration_weeks": 6,
            "icd10_codes": ["M54.5", "M54.51", "M54.59"]
        },
        {
            "id": "neurologic_weakness",
            "category": "neurological",
            "description": "Progressive neurological deficit including new or progressive muscle weakness in lower extremities",
            "keywords": ["weakness", "progressive", "motor deficit", "strength decreased", "paresis"],
            "required_duration_weeks": None,
            "icd10_codes": ["M54.4", "G57", "G54.4"]
        },
        {
            "id": "neurologic_reflexes",
            "category": "neurological",
            "description": "Absent or asymmetric deep tendon reflexes in lower extremities",
            "keywords": ["absent reflex", "asymmetric reflex", "decreased reflex", "patellar reflex", "Achilles reflex", "DTR"],
            "required_duration_weeks": None,
            "icd10_codes": ["R29.2"]
        },
        {
            "id": "neurologic_sensory",
            "category": "neurological",
            "description": "Dermatomal sensory loss consistent with nerve root compression",
            "keywords": ["sensory loss", "numbness", "tingling", "paresthesia", "dermatomal", "sensation decreased"],
            "required_duration_weeks": None,
            "icd10_codes": ["R20.2", "M54.4"]
        },
        {
            "id": "cauda_equina",
            "category": "neurological",
            "description": "Signs or symptoms of cauda equina syndrome: bowel/bladder dysfunction, saddle anesthesia",
            "keywords": ["cauda equina", "bowel dysfunction", "bladder dysfunction", "urinary incontinence", "saddle anesthesia", "saddle numbness", "perineal numbness", "fecal incontinence"],
            "required_duration_weeks": None,
            "icd10_codes": ["G83.4"]
        },
        {
            "id": "trauma",
            "category": "trauma",
            "description": "Significant trauma to spine (fall, MVA, direct blow) with suspected fracture or instability",
            "keywords": ["trauma", "fracture", "fall", "MVA", "motor vehicle", "compression fracture", "instability"],
            "required_duration_weeks": None,
            "icd10_codes": ["S32", "M48.4"]
        },
        {
            "id": "tumor_mass",
            "category": "tumor",
            "description": "Suspected spinal tumor or metastatic disease: unexplained weight loss, history of malignancy, elevated tumor markers, lytic lesion on X-ray",
            "keywords": ["tumor", "malignancy", "cancer", "metastasis", "metastatic", "lytic lesion", "weight loss", "PSA elevated", "mass"],
            "required_duration_weeks": None,
            "icd10_codes": ["C79.51", "D49.2", "M49.5"]
        },
        {
            "id": "infection",
            "category": "infection",
            "description": "Suspected spinal infection: fever, elevated ESR/CRP, IV drug use, immunocompromised state",
            "keywords": ["infection", "osteomyelitis", "discitis", "fever", "elevated ESR", "elevated CRP", "IV drug use", "immunocompromised", "abscess"],
            "required_duration_weeks": None,
            "icd10_codes": ["M46.3", "M46.4"]
        },
        {
            "id": "positive_slr",
            "category": "neurological",
            "description": "Positive straight leg raise test consistent with radiculopathy",
            "keywords": ["straight leg raise", "SLR positive", "positive SLR", "Lasegue"],
            "required_duration_weeks": None,
            "icd10_codes": ["M54.4"]
        },
        {
            "id": "radiculopathy_confirmed",
            "category": "neurological",
            "description": "Radiculopathy confirmed or strongly suspected based on clinical findings",
            "keywords": ["radiculopathy", "radicular", "sciatica", "nerve root", "radiation to leg", "leg pain"],
            "required_duration_weeks": None,
            "icd10_codes": ["M54.4", "M54.3"]
        }
    ],
    "exclusion_criteria": [
        {
            "id": "acute_uncomplicated",
            "description": "Acute uncomplicated low back pain (<6 weeks) without neurological findings",
            "keywords": ["acute", "uncomplicated", "no neurological", "no radiculopathy"]
        },
        {
            "id": "no_conservative_trial",
            "description": "Patient has not trialed conservative therapy (PT, medication) for at least 6 weeks",
            "keywords": ["no physical therapy", "no conservative treatment", "no prior treatment"]
        }
    ]
}
