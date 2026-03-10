import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Download, X, Filter, ExternalLink } from 'lucide-react';
import { getSubmissionHistory } from '../api/healthprior';

type Decision = 'APPROVED' | 'DENIED' | 'NEEDS_MORE_INFO' | 'ALL';

interface Submission {
  id: string;
  created_at: string;
  decision: string | null;
  raw_note_preview: string;
  patient_id?: string;
  policy?: string;
  confidence_score?: number;
}

const decisionColors: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  DENIED: { bg: 'rgba(252,93,54,0.1)', text: '#FC5D36', border: 'rgba(252,93,54,0.3)' },
  NEEDS_MORE_INFO: { bg: 'rgba(253,179,82,0.15)', text: '#d97706', border: 'rgba(253,179,82,0.4)' },
};

function DecisionPill({ decision }: { decision: string | null }) {
  const d = decision || 'UNKNOWN';
  const style = decisionColors[d] || { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-[100px] text-xs font-semibold"
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: 'Instrument Sans, sans-serif',
      }}
    >
      {d}
    </span>
  );
}

function DetailModal({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl w-full max-w-lg"
          style={{ background: '#FFFFFF', border: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
            <h3 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#000' }}>
              Submission Detail
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
            >
              <X className="w-4 h-4" style={{ color: '#6b7280' }} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span
                  className="block uppercase tracking-wider mb-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
                >
                  Submission ID
                </span>
                <span style={{ fontFamily: 'Inter, monospace', fontSize: '12px', color: '#363636' }}>
                  {submission.id}
                </span>
              </div>
              <div>
                <span
                  className="block uppercase tracking-wider mb-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
                >
                  Date
                </span>
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                  {new Date(submission.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span
                  className="block uppercase tracking-wider mb-1"
                  style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
                >
                  Decision
                </span>
                <DecisionPill decision={submission.decision} />
              </div>
              {submission.confidence_score !== undefined && (
                <div>
                  <span
                    className="block uppercase tracking-wider mb-1"
                    style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
                  >
                    Confidence
                  </span>
                  <span style={{ fontFamily: 'Inter, monospace', fontSize: '14px', color: '#363636' }}>
                    {Math.round(submission.confidence_score * 100)}%
                  </span>
                </div>
              )}
              {submission.policy && (
                <div className="col-span-2">
                  <span
                    className="block uppercase tracking-wider mb-1"
                    style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
                  >
                    Policy
                  </span>
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                    {submission.policy}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span
                className="block uppercase tracking-wider mb-2"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9ca3af' }}
              >
                Note Preview
              </span>
              <div
                className="rounded-xl p-3 text-xs leading-relaxed"
                style={{
                  background: '#FAF9F5',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'Inter, monospace',
                  color: '#363636',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {submission.raw_note_preview || 'No preview available.'}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Decision>('ALL');
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    getSubmissionHistory()
      .then((data) => setSubmissions(data as Submission[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL'
    ? submissions
    : submissions.filter((s) => s.decision === filter);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Submission ID', 'Patient ID', 'Policy', 'Decision', 'Confidence Score'],
      ...filtered.map((s) => [
        new Date(s.created_at).toLocaleString(),
        s.id,
        s.patient_id || '',
        s.policy || '',
        s.decision || '',
        s.confidence_score !== undefined ? `${Math.round(s.confidence_score * 100)}%` : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'healthprior-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterButtons: Decision[] = ['ALL', 'APPROVED', 'DENIED', 'NEEDS_MORE_INFO'];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero banner */}
      <div className="relative w-full rounded-2xl overflow-hidden mb-8" style={{ height: '160px' }}>
        <img
          src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1400&q=80&auto=format&fit=crop"
          alt="Medical records"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 60%' }}
        />
        <div
          className="absolute inset-0 flex items-center px-8"
          style={{ background: 'linear-gradient(to right, rgba(6,11,19,0.85) 50%, rgba(6,11,19,0.2))' }}
        >
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#FC5D36', letterSpacing: '0.08em', marginBottom: '6px' }}>
              PRIOR AUTH SUBMISSIONS
            </p>
            <h2 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '22px', color: '#fff', margin: 0 }}>
              Submission History
            </h2>
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              {submissions.length} total · Molina MCR-621 · CPT 72148
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(252,93,54,0.1)', border: '1px solid rgba(252,93,54,0.25)' }}
          >
            <History className="w-6 h-6" style={{ color: '#FC5D36' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '24px', color: '#000' }}>
              Submission History
            </h1>
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#6b7280' }}>
              {submissions.length} total submissions
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          className="btn-outline flex items-center gap-2"
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4" style={{ color: '#9ca3af' }} />
        <div className="flex gap-2">
          {filterButtons.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-[100px] text-sm transition-all"
              style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '13px',
                fontWeight: filter === f ? 600 : 400,
                background: filter === f ? '#FC5D36' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : '#6b7280',
                border: filter === f ? '1px solid #FC5D36' : '1px solid #e5e7eb',
              }}
            >
              {f === 'ALL' ? 'All' : f === 'NEEDS_MORE_INFO' ? 'Needs Info' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#FC5D36] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3" style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#6b7280' }}>
            Loading history...
          </span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(252,93,54,0.05)', border: '1px solid rgba(252,93,54,0.2)' }}
        >
          <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#FC5D36' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: '#FFFFFF' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }} />
              <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#9ca3af' }}>
                No submissions found.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAF9F5', borderBottom: '1px solid #e5e7eb' }}>
                  {['Date', 'Patient ID', 'Policy', 'Decision', 'Confidence', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left"
                      style={{
                        fontFamily: 'Instrument Sans, sans-serif',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(252,93,54,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td className="px-5 py-3.5">
                      <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className="block"
                        style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', color: '#9ca3af' }}
                      >
                        {new Date(s.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontFamily: 'Inter, monospace', fontSize: '12px', color: '#363636' }}>
                        {s.patient_id || s.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
                        {s.policy || 'MCR-621'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <DecisionPill decision={s.decision} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span style={{ fontFamily: 'Inter, monospace', fontSize: '13px', color: '#363636' }}>
                        {s.confidence_score !== undefined
                          ? `${Math.round(s.confidence_score * 100)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ExternalLink className="w-4 h-4" style={{ color: '#d1d5db' }} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selected && <DetailModal submission={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
