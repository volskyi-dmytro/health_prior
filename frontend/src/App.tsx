import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { WizardProgress } from './components/WizardProgress';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Step1_NoteInput } from './steps/Step1_NoteInput';
import { Step2_FHIRStructuring } from './steps/Step2_FHIRStructuring';
import { Step3_CoverageDecision } from './steps/Step3_CoverageDecision';
import { Step4_PriorAuth } from './steps/Step4_PriorAuth';
import { structureNote, evaluateCoverage, generatePriorAuth } from './api/healthprior';
import type { WizardStep, FHIRBundle, CoverageResult, PriorAuthPackage } from './types';

export default function App() {
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawNote, setRawNote] = useState('');
  const [fhirBundle, setFhirBundle] = useState<FHIRBundle | null>(null);
  const [coverageResult, setCoverageResult] = useState<CoverageResult | null>(null);
  const [priorAuth, setPriorAuth] = useState<PriorAuthPackage | null>(null);

  const handleStructureNote = async (note: string, model: string) => {
    setLoading(true);
    setError(null);
    setRawNote(note);
    try {
      const result = await structureNote(note, model);
      setFhirBundle(result.fhir_bundle);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to structure note');
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
    setCoverageResult(null);
    setPriorAuth(null);
    setError(null);
  };

  return (
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
          <div className="flex items-center gap-3">
            {/* Logo mark */}
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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FC5D36' }} />
              <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>MCP Connected</span>
            </div>
            <button
              className="btn-primary"
              style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              Book a Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
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

        {loading && step === 1 && <LoadingSpinner message="Calling MCP server + structuring note with LLM..." />}
        {loading && step === 2 && <LoadingSpinner message="Evaluating against Molina MCR-621 criteria..." />}
        {loading && step === 3 && <LoadingSpinner message="Generating prior auth package..." />}

        <AnimatePresence mode="wait">
          {!loading && (
            <>
              {step === 1 && (
                <Step1_NoteInput onSubmit={handleStructureNote} loading={loading} />
              )}
              {step === 2 && fhirBundle && (
                <Step2_FHIRStructuring
                  fhirBundle={fhirBundle}
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
          <div style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}>
            <span>Privacy Policy</span>
            <span className="mx-2">|</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
