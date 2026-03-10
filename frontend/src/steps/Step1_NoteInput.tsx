import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, ChevronRight, Cpu, GitCompare, FileText, Server } from 'lucide-react';
import { getSampleNotes, getPolicies } from '../api/healthprior';
import type { SampleNote, Policy } from '../types';

type InputTab = 'paste' | 'fhir';

const MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (faster)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
];

interface Props {
  onSubmit: (note: string, model: string, policyId: string, modelB?: string) => void;
  onFetchFromFHIR?: (fhirServerUrl: string, patientId: string) => void;
  loading: boolean;
}

export function Step1_NoteInput({ onSubmit, onFetchFromFHIR, loading }: Props) {
  const [note, setNote] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [modelB, setModelB] = useState(MODELS[1].value);
  const [compareMode, setCompareMode] = useState(false);
  const [samples, setSamples] = useState<SampleNote[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState('MCR-621');
  const [activeTab, setActiveTab] = useState<InputTab>('paste');
  const [fhirServerUrl, setFhirServerUrl] = useState('https://hapi.fhir.org/baseR4');
  const [fhirPatientId, setFhirPatientId] = useState('');

  useEffect(() => {
    getSampleNotes().then(setSamples).catch(console.error);
    getPolicies()
      .then(setPolicies)
      .catch(() => {
        // fallback default policy
        setPolicies([{ id: 'MCR-621', name: 'Molina MCR-621: Lumbar Spine MRI' }]);
      });
  }, []);

  const decisionStyle = (d: string) => {
    if (d === 'APPROVED') return { color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '100px' };
    if (d === 'DENIED') return { color: '#FC5D36', background: 'rgba(252,93,54,0.1)', padding: '2px 8px', borderRadius: '100px' };
    return { color: '#d97706', background: 'rgba(253,179,82,0.15)', padding: '2px 8px', borderRadius: '100px' };
  };

  const handleSubmit = () => {
    if (!note.trim()) return;
    onSubmit(note, model, policyId, compareMode ? modelB : undefined);
  };

  const handleFetchFromFHIR = () => {
    if (!fhirServerUrl.trim() || !fhirPatientId.trim()) return;
    onFetchFromFHIR?.(fhirServerUrl.trim(), fhirPatientId.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: 'rgba(252,93,54,0.1)', border: '1px solid rgba(252,93,54,0.25)' }}
        >
          <Stethoscope className="w-7 h-7" style={{ color: '#FC5D36' }} />
        </div>
        <h2
          style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '28px', color: '#000', marginBottom: '8px' }}
        >
          Clinical Note Input
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: '#6b7280' }}>
          Paste a clinical note or fetch from a FHIR server to begin prior authorization analysis
        </p>
      </div>

      {/* Contextual image strip */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-6 flex"
        style={{ height: '100px', border: '1px solid #e5e7eb' }}
      >
        <img
          src="https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80&auto=format&fit=crop"
          alt="Lumbar spine MRI"
          style={{ width: '160px', height: '100%', objectFit: 'cover', objectPosition: 'center', flexShrink: 0 }}
        />
        <div
          className="flex items-center gap-8 px-6"
          style={{ background: '#fff', flex: 1 }}
        >
          {[
            { label: 'Policy', value: 'Molina MCR-621' },
            { label: 'Procedure', value: 'Lumbar Spine MRI' },
            { label: 'CPT Code', value: '72148' },
            { label: 'Protocol', value: 'FHIR R4 · A2A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '13px', color: '#111' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex mb-5" style={{ borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('paste')}
          className="flex items-center gap-2 px-4 py-2.5 transition-all"
          style={{
            fontFamily: 'Instrument Sans, sans-serif',
            fontSize: '14px',
            fontWeight: activeTab === 'paste' ? 600 : 400,
            color: activeTab === 'paste' ? '#FC5D36' : '#6b7280',
            borderBottom: activeTab === 'paste' ? '2px solid #FC5D36' : '2px solid transparent',
            marginBottom: '-2px',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          <FileText className="w-4 h-4" />
          Paste Clinical Note
        </button>
        <button
          onClick={() => setActiveTab('fhir')}
          className="flex items-center gap-2 px-4 py-2.5 transition-all"
          style={{
            fontFamily: 'Instrument Sans, sans-serif',
            fontSize: '14px',
            fontWeight: activeTab === 'fhir' ? 600 : 400,
            color: activeTab === 'fhir' ? '#FC5D36' : '#6b7280',
            borderBottom: activeTab === 'fhir' ? '2px solid #FC5D36' : '2px solid transparent',
            marginBottom: '-2px',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          <Server className="w-4 h-4" />
          Fetch from FHIR Server
        </button>
      </div>

      {/* Policy Selector */}
      <div className="rounded-xl p-4 mb-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" style={{ color: '#9ca3af' }} />
          <span
            className="uppercase tracking-wider"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
          >
            Coverage Policy
          </span>
        </div>
        <select
          value={policyId}
          onChange={(e) => setPolicyId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 focus:outline-none transition-all"
          style={{
            fontFamily: 'Instrument Sans, sans-serif',
            fontSize: '14px',
            color: '#363636',
            background: '#FAF9F5',
            border: '1px solid #e5e7eb',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,93,54,0.5)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >
          {policies.length === 0 && (
            <option value="MCR-621">Molina MCR-621: Lumbar Spine MRI</option>
          )}
          {policies.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {activeTab === 'paste' && (
        <>
          {/* Sample note buttons */}
          {samples.length > 0 && (
            <div className="grid grid-cols-1 gap-2 mb-4">
              <p
                className="uppercase tracking-wider"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
              >
                Load sample note:
              </p>
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setNote(s.content)}
                  className="flex items-center justify-between p-4 rounded-xl text-left group transition-all"
                  style={{ border: '1px solid #e5e7eb', background: '#FFFFFF' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(252,93,54,0.4)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(252,93,54,0.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
                  }}
                >
                  <div>
                    <span
                      className="block"
                      style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: '#060B13' }}
                    >
                      {s.title}
                    </span>
                    <span
                      className="block mt-0.5"
                      style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}
                    >
                      {s.description}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{ fontFamily: 'Inter, sans-serif', ...decisionStyle(s.expected_decision) }}
                  >
                    {s.expected_decision}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Note textarea */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Paste clinical note here (H&P, discharge summary, progress note)..."
            className="w-full h-64 p-4 resize-none focus:outline-none transition-all rounded-xl"
            style={{
              fontFamily: 'Inter, monospace',
              fontSize: '13px',
              color: '#060B13',
              background: '#FFFFFF',
              border: '1px solid #e5e7eb',
              lineHeight: '1.6',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,93,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,93,54,0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
          />

          {/* Compare models toggle */}
          <div className="flex items-center gap-3 mt-3 mb-3">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                border: compareMode ? '1px solid rgba(252,93,54,0.5)' : '1px solid #e5e7eb',
                background: compareMode ? 'rgba(252,93,54,0.08)' : '#FFFFFF',
                color: compareMode ? '#FC5D36' : '#6b7280',
              }}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare Models
            </button>
            {compareMode && (
              <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}>
                Side-by-side FHIR extraction comparison
              </span>
            )}
          </div>

          {/* Model picker + submit */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 flex-1">
              <Cpu className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-[100px] px-4 py-2 focus:outline-none flex-1 transition-all"
                style={{
                  fontFamily: 'Instrument Sans, sans-serif',
                  fontSize: '14px',
                  color: '#363636',
                  background: '#FFFFFF',
                  border: '1px solid #e5e7eb',
                }}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {compareMode && (
                <>
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}>vs</span>
                  <select
                    value={modelB}
                    onChange={(e) => setModelB(e.target.value)}
                    className="rounded-[100px] px-4 py-2 focus:outline-none flex-1 transition-all"
                    style={{
                      fontFamily: 'Instrument Sans, sans-serif',
                      fontSize: '14px',
                      color: '#363636',
                      background: '#FFFFFF',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={!note.trim() || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <span>Analyzing...</span>
              ) : (
                <>
                  <span>Analyze Note</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </>
      )}

      {activeTab === 'fhir' && (
        <div className="rounded-xl p-6" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}>
          <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
            Connects to a FHIR R4 server and retrieves Patient, Conditions, Medications, and Observations
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                FHIR Server URL
              </label>
              <input
                type="text"
                value={fhirServerUrl}
                onChange={(e) => setFhirServerUrl(e.target.value)}
                placeholder="https://hapi.fhir.org/baseR4"
                className="w-full rounded-lg px-3 py-2.5 focus:outline-none transition-all"
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '13px',
                  color: '#060B13',
                  background: '#FAF9F5',
                  border: '1px solid #e5e7eb',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,93,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,93,54,0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Patient ID
              </label>
              <input
                type="text"
                value={fhirPatientId}
                onChange={(e) => setFhirPatientId(e.target.value)}
                placeholder="e.g. 592941"
                className="w-full rounded-lg px-3 py-2.5 focus:outline-none transition-all"
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '13px',
                  color: '#060B13',
                  background: '#FAF9F5',
                  border: '1px solid #e5e7eb',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,93,54,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,93,54,0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFetchFromFHIR(); }}
              />
            </div>

            <div className="flex justify-end mt-2">
              <motion.button
                onClick={handleFetchFromFHIR}
                disabled={!fhirServerUrl.trim() || !fhirPatientId.trim() || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <span>Fetching...</span>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    <span>Fetch Patient Record</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
