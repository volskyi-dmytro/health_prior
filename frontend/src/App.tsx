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
    <div
      className="min-h-screen bg-navy-900 text-white"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1427 50%, #0a0f1e 100%)' }}
    >
      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <span className="text-navy-900 font-bold text-sm">HP</span>
            </div>
            <div>
              <span className="font-display text-lg text-white">HealthPrior</span>
              <span className="text-slate-500 text-xs ml-2 font-mono">Clinical AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-400">MCP Connected</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <WizardProgress current={step} />

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">x</button>
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
      <footer className="border-t border-slate-800/60 px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs font-mono text-slate-600">
          <span>HealthPrior v1.0 — Latitude Health Assessment</span>
          <span>Molina MCR-621 · CPT 72148 · FHIR R4</span>
        </div>
      </footer>
    </div>
  );
}
