# What Is HealthPrior? A Plain-English Guide

## The Problem: Insurance Paperwork That Costs Patients Time

Imagine a patient comes in with severe back pain radiating down their leg. Their doctor examines them, orders physical therapy, tries medications, and after six weeks of no improvement, decides an MRI is needed to look for a herniated disc or nerve compression. The doctor knows the procedure is medically necessary. The patient is in pain. Everyone is ready to move forward.

But first, the insurance company has to say yes.

This process is called prior authorization. Before a doctor can order certain expensive or specialized procedures — MRIs, surgeries, specialist referrals — the insurance company requires them to submit documentation proving the treatment is medically necessary according to their coverage rules. On paper, this sounds reasonable. In practice, it has become one of the biggest administrative burdens in American healthcare.

Physicians and their staff spend enormous amounts of time — estimates suggest prior authorization alone consumes roughly a quarter of physician working hours — filling out paper forms, digging through patient charts for the right supporting details, faxing documents to insurance reviewers, and then waiting. Sometimes days. Sometimes longer. During that waiting period, patients are in limbo: unable to get the care their doctor has already decided they need.

HealthPrior was built to change that.

## What HealthPrior Does

HealthPrior is an AI-powered assistant that automates the prior authorization process from start to finish. Think of it as a smart medical secretary who reads the doctor's notes, fills out all the insurance paperwork, checks whether the case is likely to be approved, and hands over a ready-to-submit package — in seconds instead of days.

Here is what actually happens when a doctor uses HealthPrior:

**The doctor provides patient information.** They can paste the clinical note they already wrote — the same narrative they would have written anyway — directly into the system. Or, if the hospital uses a modern electronic health record system, HealthPrior can pull the patient's data directly from that system without any copy-pasting at all.

**The AI reads and organizes the information.** The clinical note is written in natural language, the way doctors actually write: "Patient presents with six weeks of low back pain, worse with prolonged sitting, radiating to the left leg with associated paresthesias..." HealthPrior reads that note and converts it into structured, standardized medical data — a recognized format called FHIR — identifying the diagnoses, medications, test results, and examination findings that matter for the authorization request.

**The AI checks the insurance criteria.** Every insurance company has coverage policies that define exactly when they will and will not approve a given procedure. HealthPrior loads those criteria and compares the patient's clinical data against them automatically. For the lumbar spine MRI example, it checks whether the patient has had at least six weeks of conservative treatment, whether there are neurological signs, whether the right diagnostic codes are present, and more. It returns a clear verdict: Approved, Denied, or Needs More Information — along with an explanation of which criteria were met or missed.

**The AI generates the authorization package.** If the case looks strong, HealthPrior produces a complete prior authorization package: the structured clinical data, the supporting rationale, and a formatted letter ready to submit to the insurance company. The doctor can download it as a PDF and send it off immediately.

The entire process — from pasting a note to having a submission-ready package — takes under a minute.

## Walking Through the Four Steps

HealthPrior presents this workflow as a simple four-step process.

In **Step 1**, the doctor provides patient information. They can type or paste a clinical note, or enter a patient identifier to pull records directly from the hospital's EHR system. There is also a policy selector so the system knows which insurance company's rules to evaluate against.

In **Step 2**, the doctor reviews what the AI extracted. The system displays all the relevant clinical findings it found — diagnoses, medications, observations from the physical exam — organized clearly and linked back to the exact section of the original note where each piece of information came from. This is the transparency step: the doctor can verify the AI read the note correctly before proceeding.

In **Step 3**, the AI evaluates coverage. It runs the patient's clinical profile against the insurance company's criteria and returns a decision with confidence level and a plain-English summary explaining its reasoning. If the system needs additional clinical details to make a determination, it asks a specific follow-up question rather than returning a vague denial.

In **Step 4**, the prior authorization package is ready. The doctor can download a formatted PDF letter or a structured data file, and the system stores a complete audit trail — every AI decision, every piece of data used — so the submission is fully traceable and defensible.

## Why This Matters

Prior authorization denials delay care for millions of patients each year. Studies have found that physicians submit tens of thousands of prior auth requests annually per practice, and a significant portion of their time — time that could be spent with patients — goes toward administrative work that generates no clinical value.

The consequences fall on patients too. Delays in getting an MRI can mean weeks of undiagnosed nerve compression, delayed cancer detection, or deteriorating conditions that become more expensive to treat the longer they wait. Some patients simply give up and never get the procedure their doctor ordered.

HealthPrior addresses this at the source. By turning a process that takes days of back-and-forth into something that takes less than a minute, it frees physicians to focus on medicine, reduces practice overhead, and most importantly gets patients the care they need faster.

## Key Terms, Defined Simply

**Prior Authorization** — A requirement from an insurance company that a doctor get approval before ordering a specific procedure or medication. The doctor must submit documentation showing the treatment is medically necessary under the insurance company's coverage rules.

**FHIR** (pronounced "fire") — The modern standard for exchanging healthcare information digitally. Think of it as a universal language that different hospital systems, insurance companies, and health apps can all read and write. HealthPrior converts unstructured doctor's notes into this format so the data can be used and verified reliably.

**Clinical Note** — The written record a physician creates after seeing a patient, describing the patient's symptoms, examination findings, diagnoses, and treatment plan. These are typically written in narrative prose, not structured data — which is why AI is needed to interpret them.

**CPT Code** — A standardized five-digit number that identifies a specific medical procedure. CPT 72148, for example, is the code for a lumbar spine MRI without contrast. Insurance companies use these codes to determine which procedures require prior authorization and which coverage rules apply.

**ICD-10 Code** — A standardized alphanumeric code that identifies a specific medical diagnosis. For example, M54.4 is the code for lumbago with sciatica. Pairing the right diagnosis codes with the right procedure codes is essential for prior authorization approval.

**Coverage Criteria** — The specific clinical requirements an insurance company uses to decide whether to approve a procedure. For a lumbar spine MRI, Molina Healthcare's criteria (the policy HealthPrior uses as its reference) require things like at least six weeks of low back pain, documented failure of conservative treatments, and specific neurological findings. HealthPrior checks all of these automatically.
