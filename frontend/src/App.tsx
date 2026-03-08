import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { WizardProgress } from './components/WizardProgress';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Step1_NoteInput } from './steps/Step1_NoteInput';
import { Step2_FHIRStructuring } from './steps/Step2_FHIRStructuring';
import { Step3_CoverageDecision } from './steps/Step3_CoverageDecision';
import { Step4_PriorAuth } from './steps/Step4_PriorAuth';
import { HistoryPage } from './pages/HistoryPage';
import { structureNote, evaluateCoverage, generatePriorAuth, API_BASE } from './api/healthprior';
import type { WizardStep, FHIRBundle, CoverageResult, PriorAuthPackage } from './types';

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
        color: isActive ? '#FC5D36' : '#363636',
        textDecoration: 'none',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#FC5D36'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#363636'; }}
    >
      {children}
    </Link>
  );
}

function WizardApp() {
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
          structureNote(note, model, policyId),
          structureNote(note, modelB, policyId),
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

          await fetchEventSource(`${API_BASE}/notes/structure/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note, model, policy_id: policyId }),
            onmessage(ev) {
              if (ev.event === 'resource') {
                try {
                  const resource = JSON.parse(ev.data);
                  resources.push(resource);
                  setStreamedResources([...resources]);
                } catch { /* ignore parse error */ }
              } else if (ev.event === 'done') {
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
              patient_demographics: {},
            };
            setFhirBundle(bundle);
            streamWorked = true;
          }
        } catch {
          // SSE not supported or failed — fall back to normal POST
        }

        if (!streamWorked) {
          const result = await structureNote(note, model, policyId);
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

  const handleEvaluateCoverage = async () => {
    if (!fhirBundle) return;
    setLoading(true);
    setError(null);
    try {
      const result = await evaluateCoverage(fhirBundle, rawNote);
      setCoverageResult(result);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to evaluate coverage');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePriorAuth = async () => {
    if (!fhirBundle || !coverageResult) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generatePriorAuth(fhirBundle, coverageResult, rawNote);
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
  };

  // Build a partial bundle for streaming display
  const streamingBundle: FHIRBundle | null = isStreaming && streamedResources.length > 0
    ? { resourceType: 'Bundle', type: 'collection', entry: streamedResources, patient_demographics: {} }
    : null;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
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

      {loading && step === 1 && !isStreaming && <LoadingSpinner message="Calling MCP server + structuring note with LLM..." />}
      {loading && step === 2 && <LoadingSpinner message="Evaluating against Molina MCR-621 criteria..." />}
      {loading && step === 3 && <LoadingSpinner message="Generating prior auth package..." />}

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
              <Step1_NoteInput onSubmit={handleStructureNote} loading={loading} />
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
            {step === 3 && coverageResult && (
              <Step3_CoverageDecision
                coverageResult={coverageResult}
                onNext={handleGeneratePriorAuth}
                loading={loading}
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
      <div className="min-h-screen" style={{ background: '#FAF9F5' }}>
        {/* Announcement bar */}
        <div
          className="w-full text-center py-2 px-4 text-sm"
          style={{ background: '#F9BA54', fontFamily: 'Instrument Sans, sans-serif', color: '#000' }}
        >
          Prior authorization automation powered by clinical AI — Molina MCR-621 · CPT 72148 · FHIR R4
        </div>

        {/* Navigation */}
        <header
          className="sticky top-0 z-50 border-b px-6"
          style={{ background: '#FFFFFF', borderColor: '#e5e7eb', height: '72px', display: 'flex', alignItems: 'center' }}
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
                <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#000' }}>
                  HealthPrior
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#FC5D36', marginLeft: '8px' }}>
                  Clinical AI
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <NavLink to="/history">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  History
                </span>
              </NavLink>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FC5D36' }} />
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>MCP Connected</span>
              </div>
            </div>
          </div>
        </header>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<WizardApp />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>

        {/* Footer */}
        <footer className="border-t px-6 py-6 mt-10" style={{ borderColor: '#e5e7eb', background: '#FFFFFF' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)' }}
              >
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>HP</span>
              </div>
              <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                HealthPrior — Latitude Health Assessment
              </span>
            </div>
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}>
              Molina MCR-621 · CPT 72148 · FHIR R4
            </span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
