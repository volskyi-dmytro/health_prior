from app.models.schemas import SampleNote

SAMPLE_NOTES = [
    SampleNote(
        id="note_001",
        title="Chronic Back Pain — PT Complete",
        description="8 weeks LBP, completed physical therapy, persistent pain",
        expected_decision="APPROVED",
        type="H&P",
        content="""PATIENT: John M., DOB: 05/14/1968, MRN: 4821039
DATE OF SERVICE: March 5, 2026
ATTENDING PHYSICIAN: Dr. Sarah Chen, MD — Family Medicine

CHIEF COMPLAINT:
Persistent low back pain radiating to left leg, 8/10 severity, ongoing for 10 weeks.

HISTORY OF PRESENT ILLNESS:
Mr. M. is a 57-year-old male presenting with a 10-week history of progressively worsening low back pain with radiation to the left leg following L4-L5 dermatomal distribution. Pain onset was insidious with no specific traumatic event. He rates his pain 8/10 at rest and 10/10 with activity. He completed a full 8-week course of physical therapy (24 sessions, completed February 18, 2026) with minimal improvement — only 10% reduction in VAS pain score. He has been taking ibuprofen 600mg TID with food and cyclobenzaprine 5mg at bedtime for the past 6 weeks without adequate relief. He reports significant functional limitation: unable to sit for more than 15 minutes, unable to walk more than one block, and has missed 3 weeks of work as a warehouse manager.

PAST MEDICAL HISTORY:
- Hypertension (controlled on lisinopril)
- Type 2 diabetes mellitus (HbA1c 7.2% as of January 2026)
- No prior spinal surgery or procedures
- No history of malignancy

MEDICATIONS:
- Lisinopril 10mg daily
- Metformin 1000mg BID
- Ibuprofen 600mg TID PRN pain
- Cyclobenzaprine 5mg QHS PRN

ALLERGIES: Penicillin (rash)

REVIEW OF SYSTEMS:
- MSK: Low back pain, left leg pain, limited ROM
- Neuro: Mild tingling in left foot, no bowel or bladder dysfunction
- Constitutional: No fever, weight loss, or night sweats

PHYSICAL EXAMINATION:
Vital Signs: BP 132/84, HR 76, Temp 98.6F, Weight 218 lbs, BMI 31.2
General: Alert, cooperative male in mild-to-moderate distress
Spine: Lumbar range of motion severely limited — flexion 20 degrees, extension 10 degrees, lateral bending 10 degrees bilaterally. Significant paraspinal muscle spasm at L4-L5 level bilaterally.
Neurologic: Strength 4/5 left hip flexion and left knee extension. Patellar reflex 1+ on left vs 2+ on right. Sensation mildly decreased to light touch along left L4 dermatomal distribution.
Straight Leg Raise: Positive at 40 degrees on left, negative on right.
FABER/FADIR: Negative bilaterally.

LABORATORY/IMAGING:
- X-ray lumbar spine (January 28, 2026): Moderate degenerative disc disease at L4-L5 and L5-S1. Facet arthropathy at L4-L5. No fracture or listhesis.
- CBC, CMP within normal limits (February 2026)
- ESR 18 mm/hr (normal)

ASSESSMENT & PLAN:
1. Lumbar radiculopathy L4-L5 (M54.4) — left-sided, with incomplete response to conservative therapy
2. Lumbar degenerative disc disease (M51.16) — confirmed on X-ray
3. Hypertension — stable
4. Type 2 DM — stable

Plan: Patient has completed >6 weeks of conservative therapy including physical therapy and NSAID treatment without adequate response. Given persistent radiculopathy, neurologic findings (diminished reflex, dermatomal weakness, positive SLR), and significant functional impairment, requesting MRI lumbar spine without contrast (CPT 72148) to evaluate for disc herniation, nerve root compression, or other structural pathology requiring further intervention. Referral to spine surgery for evaluation pending imaging results.
"""
    ),
    SampleNote(
        id="note_002",
        title="Acute Pain — No Conservative Therapy",
        description="3 weeks LBP, no prior treatment, no neurological findings",
        expected_decision="DENIED",
        type="progress_note",
        content="""PATIENT: Maria K., DOB: 11/22/1985, MRN: 7392841
DATE OF SERVICE: March 5, 2026
ATTENDING PHYSICIAN: Dr. James Torres, MD — Urgent Care

CHIEF COMPLAINT:
Acute low back pain, 3-week duration.

HISTORY OF PRESENT ILLNESS:
Ms. K. is a 40-year-old female presenting with 3 weeks of acute low back pain. She reports the pain began after lifting a heavy box at work. Pain is 5/10 in severity, localized to the lumbar region without radiation to the lower extremities. She has not sought any treatment prior to today's visit and has not trialed any physical therapy, chiropractic care, or consistent medication regimen. She took ibuprofen once or twice "when the pain was really bad" but has not maintained a regular NSAID course. She denies any leg pain, numbness, tingling, or weakness. She denies any bowel or bladder symptoms.

PAST MEDICAL HISTORY:
- No significant past medical history
- No prior spinal surgery

MEDICATIONS:
- Oral contraceptive pill
- Ibuprofen PRN (intermittent)

ALLERGIES: NKDA

REVIEW OF SYSTEMS:
- MSK: Low back pain only, no radiation
- Neuro: No weakness, no numbness, no bowel/bladder changes
- Constitutional: No fever, no weight loss

PHYSICAL EXAMINATION:
Vital Signs: BP 118/72, HR 68, Temp 98.4F, Weight 145 lbs
General: Comfortable female, in no acute distress
Spine: Lumbar range of motion mildly limited — flexion 60 degrees, extension 20 degrees, lateral bending 25 degrees bilaterally. Mild tenderness to palpation at L4-L5 paraspinal muscles.
Neurologic: Strength 5/5 bilateral lower extremities. Reflexes 2+ and symmetric. Sensation intact throughout.
Straight Leg Raise: Negative bilaterally.
Gait: Normal

LABORATORY/IMAGING:
- No imaging performed

ASSESSMENT & PLAN:
1. Acute mechanical low back pain (M54.5)

Plan: Patient presents with acute mechanical low back pain of 3-week duration following a workplace lifting incident. No neurological deficits, no radiculopathy, negative SLR bilaterally. Patient has not trialed conservative measures. Initiating treatment plan: ibuprofen 600mg TID with food x4 weeks, methocarbamol 750mg TID PRN muscle spasm, referral to physical therapy for 6-week course. Educated patient on activity modification, proper lifting technique, and expected natural history of acute back pain. Requesting MRI lumbar spine (CPT 72148). Will reassess in 6 weeks.
"""
    ),
    SampleNote(
        id="note_003",
        title="Neurological Findings Present",
        description="Progressive weakness, absent reflexes, possible cauda equina",
        expected_decision="APPROVED",
        type="consult_note",
        content="""PATIENT: Robert A., DOB: 03/08/1955, MRN: 9182736
DATE OF SERVICE: March 5, 2026
ATTENDING PHYSICIAN: Dr. Patricia Williams, MD — Neurology

CHIEF COMPLAINT:
Progressive bilateral leg weakness and low back pain with new onset urinary urgency.

HISTORY OF PRESENT ILLNESS:
Mr. A. is a 70-year-old male with a 12-week history of progressive low back pain with bilateral leg weakness. Over the past 3 weeks, he has noted rapid progression of bilateral lower extremity weakness — he can no longer climb stairs without assistance and has fallen twice in the past week. He reports new-onset urinary urgency and two episodes of urinary incontinence over the past 10 days. He also describes saddle area numbness (perineum, inner thighs bilaterally) for the past 2 weeks. Low back pain is 7/10 and bilateral, non-radiating. He has tried acetaminophen and naproxen without relief.

PAST MEDICAL HISTORY:
- Prostate cancer — in remission, treated with radiation therapy 2018
- Hypertension
- Hyperlipidemia
- No prior spinal surgery

MEDICATIONS:
- Amlodipine 10mg daily
- Atorvastatin 40mg daily
- Acetaminophen 500mg PRN
- Naproxen 500mg BID PRN

ALLERGIES: Sulfa drugs

REVIEW OF SYSTEMS:
- MSK: Bilateral leg weakness, low back pain
- Neuro: Bilateral leg weakness, saddle paresthesia, urinary urgency/incontinence
- GU: Urinary urgency, incontinence x2 episodes
- Constitutional: 8 lb unintentional weight loss over 3 months, fatigue

PHYSICAL EXAMINATION:
Vital Signs: BP 144/88, HR 82, Temp 98.6F, Weight 172 lbs (down from 180 lbs 3 months ago)
General: Elderly male, appears fatigued, ambulatory with cane
Spine: Lumbar range of motion severely limited in all planes. Midline tenderness at L3-L4. No obvious deformity.
Neurologic:
  - Motor: Strength 3/5 bilateral hip flexors, 3/5 bilateral knee extensors, 4/5 bilateral ankle dorsiflexion. Proximal > distal weakness pattern bilaterally.
  - Reflexes: Absent patellar reflexes bilaterally. Absent Achilles reflexes bilaterally. Plantar responses downgoing.
  - Sensation: Decreased to pinprick and light touch in saddle distribution (S2-S4 dermatomes). Decreased vibration sense bilateral feet.
  - Perineal sensation: Decreased
Straight Leg Raise: Positive bilaterally at 30 degrees.
Gait: Wide-based, ataxic. Unable to tandem walk.

LABORATORY/IMAGING:
- PSA (February 2026): 18.4 ng/mL (significantly elevated from 1.2 ng/mL in 2024)
- Alkaline phosphatase: 340 U/L (elevated)
- X-ray lumbar spine (March 3, 2026): Lytic lesion at L3 vertebral body, loss of pedicle height. Differential includes metastatic disease.
- CBC: Hemoglobin 10.2 g/dL (normocytic anemia)

ASSESSMENT & PLAN:
1. Cauda equina syndrome — suspected (urinary incontinence, saddle anesthesia, bilateral lower extremity weakness)
2. Suspected spinal metastasis — given history of prostate cancer in remission, rising PSA, lytic lesion on X-ray, weight loss
3. Progressive bilateral lower extremity weakness — myelopathy vs. radiculopathy vs. metastatic compression
4. Prostate cancer history with rising PSA

URGENT Plan: This patient presents with signs and symptoms consistent with cauda equina syndrome and/or spinal cord compression secondary to possible metastatic disease. Given absent bilateral patellar and Achilles reflexes, saddle anesthesia, new urinary incontinence, progressive bilateral leg weakness, rising PSA, and lytic vertebral lesion on X-ray, emergent MRI lumbar and thoracic spine without and with contrast (CPT 72148, 72156) is indicated immediately. Neurosurgery emergent consultation placed. Dexamethasone 10mg IV initiated. Patient admitted for expedited workup and management.
"""
    ),
]

def get_sample_notes() -> list[SampleNote]:
    return SAMPLE_NOTES

def get_sample_note_by_id(note_id: str) -> SampleNote | None:
    return next((n for n in SAMPLE_NOTES if n.id == note_id), None)
