import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { History, BookOpen } from 'lucide-react';
import { WizardProgress } from './components/WizardProgress';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Step1_NoteInput } from './steps/Step1_NoteInput';
import { Step2_FHIRStructuring } from './steps/Step2_FHIRStructuring';
import { Step3_CoverageDecision } from './steps/Step3_CoverageDecision';
import { Step4_PriorAuth } from './steps/Step4_PriorAuth';
import { HistoryPage } from './pages/HistoryPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { structureNote, evaluateCoverage, generatePriorAuth, pollCoverageTask, submitCoverageReply, fetchFromFHIRServer, API_BASE } from './api/healthprior';
import type { WizardStep, FHIRBundle, CoverageResult, PriorAuthPackage, A2ADataPart, A2ATextPart } from './types';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        fontFamily: 'Instrument Sans, sans-serif',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#FC5D36' : 'rgba(255,255,255,0.6)',
        textDecoration: 'none',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#FC5D36'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
    >
      {children}
    </Link>
  );
}

function WizardApp() {
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawNote, setRawNote] = useState('');
  const [fhirBundle, setFhirBundle] = useState<FHIRBundle | null>(null);
  const [fhirBundleB, setFhirBundleB] = useState<FHIRBundle | null>(null);
  const [modelALabel, setModelALabel] = useState<string | undefined>();
  const [modelBLabel, setModelBLabel] = useState<string | undefined>();
  const [coverageResult, setCoverageResult] = useState<CoverageResult | null>(null);
  const [priorAuth, setPriorAuth] = useState<PriorAuthPackage | null>(null);
  const [streamedResources, setStreamedResources] = useState<import('./types').FHIRResource[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [a2aTaskId, setA2ATaskId] = useState<string | null>(null);
  const [payerQuestion, setPayerQuestion] = useState<string | null>(null);
  const [payerCriterion, setPayerCriterion] = useState<string | null>(null);
  // fhirFetchMeta stores resource counts from a FHIR server fetch for display purposes
  const [fhirFetchMeta, setFhirFetchMeta] = useState<{
    source: string;
    fhirServerUrl: string;
    patientId: string;
    resourceCounts: Record<string, number>;
  } | null>(null);

  const handleStructureNote = async (note: string, model: string, policyId: string, modelB?: string) => {
    setLoading(true);
    setError(null);
    setRawNote(note);
    setFhirBundleB(null);

    try {
      if (modelB) {
        // Comparison mode: call both models in parallel
        setModelALabel(model.split('/')[1] || model);
        setModelBLabel(modelB.split('/')[1] || modelB);
        const [resultA, resultB] = await Promise.all([
          structureNote(note, model, policyId, sessionId),
          structureNote(note, modelB, policyId, sessionId),
        ]);
        setFhirBundle(resultA.fhir_bundle);
        setFhirBundleB(resultB.fhir_bundle);
        setStep(2);
      } else {
        // Single model: use SSE streaming
        setModelALabel(undefined);
        setIsStreaming(true);
        setStreamedResources([]);

        let streamWorked = false;
        try {
          const { fetchEventSource } = await import('@microsoft/fetch-event-source');
          const resources: import('./types').FHIRResource[] = [];
          let finalBundle: FHIRBundle | null = null;

          let streamedDemographics: FHIRBundle['patient_demographics'] = {};
          await fetchEventSource(`${API_BASE}/notes/structure/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note, model, policy_id: policyId, session_id: sessionId }),
            onmessage(ev) {
              if (ev.event === 'resource') {
                try {
                  const resource = JSON.parse(ev.data);
                  resources.push(resource);
                  setStreamedResources([...resources]);
                } catch { /* ignore parse error */ }
              } else if (ev.event === 'demographics') {
                try { streamedDemographics = JSON.parse(ev.data); } catch { /* ignore */ }
              } else if (ev.event === 'complete') {
                try {
                  finalBundle = JSON.parse(ev.data);
                } catch { /* ignore */ }
              }
            },
            onerror(err) {
              throw err;
            },
            openWhenHidden: true,
          });

          if (finalBundle) {
            setFhirBundle(finalBundle);
            streamWorked = true;
          } else if (resources.length > 0) {
            // Construct a bundle from streamed resources
            const bundle: FHIRBundle = {
              resourceType: 'Bundle',
              type: 'collection',
              entry: resources,
              patient_demographics: streamedDemographics,
            };
            setFhirBundle(bundle);
            streamWorked = true;
          }
        } catch {
          // SSE not supported or failed — fall back to normal POST
        }

        if (!streamWorked) {
          const result = await structureNote(note, model, policyId, sessionId);
          setFhirBundle(result.fhir_bundle);
        }

        setIsStreaming(false);
        setStep(2);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to structure note');
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromFHIR = async (fhirServerUrl: string, patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromFHIRServer({
        fhir_server_url: fhirServerUrl,
        patient_id: patientId,
        session_id: sessionId,
      });
      setFhirBundle(result.fhir_bundle);
      setFhirFetchMeta({ source: 'fhir_server', fhirServerUrl, patientId, resourceCounts: result.resource_counts });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch patient record');
    } finally {
      setLoading(false);
    }
  };

  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  const pollUntilDone = async (task_id: string) => {
    const MAX_POLLS = 60; // 90 seconds max
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(1500);
      const task = await pollCoverageTask(task_id);
      const state = task.status.state;

      if (state === 'input-required') {
        const msg = task.status.message;
        const dataPart = msg?.parts.find(p => p.type === 'data') as A2ADataPart | undefined;
        const textPart = msg?.parts.find(p => p.type === 'text') as A2ATextPart | undefined;
        const question = (dataPart?.data as Record<string, unknown>)?.question as string
          || textPart?.text
          || 'Additional information required';
        const criterion = (dataPart?.data as Record<string, unknown>)?.criterion_at_stake as string | undefined;
        setPayerQuestion(question);
        setPayerCriterion(criterion ?? null);
        setLoading(false);
        return;
      }

      if (state === 'completed') {
        const msg = task.status.message;
        const dataPart = msg?.parts.find(p => p.type === 'data') as A2ADataPart | undefined;
        if (dataPart?.data) {
          setCoverageResult(dataPart.data as unknown as CoverageResult);
        }
        setLoading(false);
        return;
      }

      if (state === 'failed') {
        throw new Error('Payer agent evaluation failed');
      }
      // 'submitted' or 'working' — keep polling
    }
    throw new Error('Coverage evaluation timed out');
  };

  const handleEvaluateCoverage = async () => {
    if (!fhirBundle) return;
    setLoading(true);
    setError(null);
    try {
      const { task_id } = await evaluateCoverage(fhirBundle, rawNote, 'MCR-621', sessionId);
      setA2ATaskId(task_id);
      setStep(3);
      await pollUntilDone(task_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coverage evaluation failed');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitPayerReply = async (answer: string) => {
    if (!a2aTaskId) return;
    setLoading(true);
    setError(null);
    setPayerQuestion(null);
    setPayerCriterion(null);
    try {
      await submitCoverageReply(a2aTaskId, answer);
      await pollUntilDone(a2aTaskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit reply');
      setLoading(false);
    }
  };

  const handleGeneratePriorAuth = async () => {
    if (!fhirBundle || !coverageResult) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generatePriorAuth(fhirBundle, coverageResult, rawNote, sessionId);
      setPriorAuth(result);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate prior auth');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setRawNote('');
    setFhirBundle(null);
    setFhirBundleB(null);
    setModelALabel(undefined);
    setModelBLabel(undefined);
    setCoverageResult(null);
    setPriorAuth(null);
    setError(null);
    setStreamedResources([]);
    setIsStreaming(false);
    setA2ATaskId(null);
    setPayerQuestion(null);
    setPayerCriterion(null);
    setFhirFetchMeta(null);
  };

  // Build a partial bundle for streaming display
  const streamingBundle: FHIRBundle | null = isStreaming && streamedResources.length > 0
    ? { resourceType: 'Bundle', type: 'collection', entry: streamedResources, patient_demographics: {} }
    : null;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {step === 1 && (
        <div
          className="relative w-full rounded-2xl overflow-hidden mb-8"
          style={{ height: '200px' }}
        >
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80&auto=format&fit=crop"
            alt="Healthcare professional reviewing clinical data"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          <div
            className="absolute inset-0 flex flex-col justify-center px-10"
            style={{ background: 'linear-gradient(105deg, rgba(6,11,19,0.92) 40%, rgba(252,93,54,0.18) 75%, rgba(6,11,19,0.15))' }}
          >
            <div
              className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full w-fit"
              style={{ background: 'rgba(252,93,54,0.2)', border: '1px solid rgba(252,93,54,0.4)' }}
            >
              <span style={{ fontSize: '11px', color: '#FC5D36', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.05em' }}>
                CLINICAL AI · PRIOR AUTHORIZATION
              </span>
            </div>
            <h1 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '24px', color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Lumbar Spine MRI Authorization
            </h1>
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginTop: '6px' }}>
              Molina MCR-621 · CPT 72148 · FHIR R4 · A2A Protocol
            </p>
          </div>
        </div>
      )}

      <WizardProgress current={step} />

      {error && (
        <div
          className="mb-6 p-4 rounded-xl text-sm flex items-center justify-between"
          style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.3)', color: '#FC5D36', fontFamily: 'Instrument Sans, sans-serif' }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 hover:opacity-70 transition-opacity"
            style={{ color: '#FC5D36', fontWeight: 600 }}
          >
            ×
          </button>
        </div>
      )}

      {loading && step === 1 && !isStreaming && <LoadingSpinner message={fhirFetchMeta ? `Fetching from ${fhirFetchMeta.fhirServerUrl}...` : 'Calling MCP server + structuring note with LLM...'} />}
      {loading && step === 3 && !coverageResult && <LoadingSpinner message="Evaluating against Molina MCR-621 criteria..." />}
      {loading && step === 3 && coverageResult && <LoadingSpinner message="Generating prior auth package..." />}

      {/* Show streaming progress on step 1 */}
      {isStreaming && streamingBundle && (
        <Step2_FHIRStructuring
          fhirBundle={streamingBundle}
          rawNote={rawNote}
          onNext={() => {}}
          loading={true}
        />
      )}
      {isStreaming && streamedResources.length === 0 && (
        <LoadingSpinner message="Streaming FHIR resources from LLM..." />
      )}

      <AnimatePresence mode="wait">
        {!loading && !isStreaming && (
          <>
            {step === 1 && (
              <Step1_NoteInput onSubmit={handleStructureNote} onFetchFromFHIR={handleFetchFromFHIR} loading={loading} />
            )}
            {step === 2 && fhirBundle && (
              <Step2_FHIRStructuring
                fhirBundle={fhirBundle}
                fhirBundleB={fhirBundleB}
                modelALabel={modelALabel}
                modelBLabel={modelBLabel}
                rawNote={rawNote}
                onNext={handleEvaluateCoverage}
                loading={loading}
              />
            )}
            {step === 3 && (coverageResult || payerQuestion) && (
              <Step3_CoverageDecision
                coverageResult={coverageResult!}
                onNext={handleGeneratePriorAuth}
                loading={loading}
                payerQuestion={payerQuestion ?? undefined}
                payerCriterion={payerCriterion ?? undefined}
                onSubmitPayerReply={handleSubmitPayerReply}
                isLoading={loading}
              />
            )}
            {step === 4 && priorAuth && (
              <Step4_PriorAuth priorAuth={priorAuth} onReset={handleReset} />
            )}
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        {/* Announcement bar */}
        <div
          className="w-full text-center py-2 px-4 text-sm"
          style={{ background: 'rgba(249,186,84,0.12)', borderBottom: '1px solid rgba(249,186,84,0.2)', fontFamily: 'Instrument Sans, sans-serif', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}
        >
          Prior authorization automation powered by clinical AI — Molina MCR-621 · CPT 72148 · FHIR R4
        </div>

        {/* Navigation */}
        <header
          className="sticky top-0 z-50 border-b px-6"
          style={{ background: 'rgba(6,11,19,0.5)', borderColor: 'rgba(255,255,255,0.08)', height: '72px', display: 'flex', alignItems: 'center', backdropFilter: 'blur(16px)' }}
        >
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)' }}
              >
                <span style={{ color: '#fff', fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '14px' }}>HP</span>
              </div>
              <div>
                <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#ffffff' }}>
                  HealthPrior
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#FC5D36', marginLeft: '8px' }}>
                  Clinical AI
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <NavLink to="/how-it-works">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  How It Works
                </span>
              </NavLink>
              <NavLink to="/history">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  History
                </span>
              </NavLink>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FC5D36' }} />
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>MCP Connected</span>
              </div>
            </div>
          </div>
        </header>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<WizardApp />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
        </Routes>

        {/* Footer */}
        <footer className="border-t px-6 py-6 mt-10" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(6,11,19,0.5)', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)' }}
              >
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>HP</span>
              </div>
              <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                HealthPrior
              </span>
            </div>
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Molina MCR-621 · CPT 72148 · FHIR R4
            </span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
