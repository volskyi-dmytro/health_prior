import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trash2, Plus, CheckCircle2, XCircle, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { listAllowedUsers, grantAiAccess, revokeAiAccess, type AllowedUser } from '../api/healthprior';

type FeedbackState = { type: 'success' | 'error'; msg: string } | null;

export function AdminPage() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [newLogin, setNewLogin] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const reload = () => {
    setLoading(true);
    listAllowedUsers()
      .then(setUsers)
      .catch(() => showFeedback('error', 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const grant = async () => {
    const login = newLogin.trim().toLowerCase();
    if (!login) return;
    setSaving(true);
    try {
      await grantAiAccess(login);
      setNewLogin('');
      showFeedback('success', `@${login} has been granted AI access`);
      reload();
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (login: string) => {
    try {
      await revokeAiAccess(login);
      showFeedback('success', `@${login}'s access has been revoked`);
      reload();
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to revoke access');
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(110deg,#FDB352 0%,#FC5D36 100%)', boxShadow: '0 4px 14px rgba(252,93,54,0.3)' }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '22px', color: '#fff', margin: 0 }}>
              Access Management
            </h1>
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Grant or revoke AI feature access for GitHub users
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-4 mt-6 mb-8"
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <Users className="w-4 h-4" style={{ color: '#FDB352' }} />
          <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            <strong style={{ color: '#fff', fontWeight: 600 }}>{users.length}</strong> user{users.length !== 1 ? 's' : ''} with AI access
          </span>
        </div>
      </motion.div>

      {/* Grant access card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6 mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <h2 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
          Grant Access
        </h2>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
          Enter a GitHub username to allow AI-powered features.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}
            >
              @
            </span>
            <input
              type="text"
              value={newLogin}
              onChange={e => setNewLogin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && grant()}
              placeholder="github-username"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px 10px 28px',
                color: '#fff',
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(253,179,82,0.5)'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>
          <button
            onClick={grant}
            disabled={saving || !newLogin.trim()}
            className="flex items-center gap-2"
            style={{
              background: saving || !newLogin.trim()
                ? 'rgba(253,179,82,0.15)'
                : 'linear-gradient(110deg,#FDB352,#FC5D36)',
              color: saving || !newLogin.trim() ? 'rgba(255,255,255,0.35)' : '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving || !newLogin.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
              boxShadow: saving || !newLogin.trim() ? 'none' : '0 4px 14px rgba(252,93,54,0.3)',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Granting…' : 'Grant Access'}
          </button>
        </div>
      </motion.div>

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
            style={{
              background: feedback.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(252,93,54,0.1)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(252,93,54,0.25)'}`,
              color: feedback.type === 'success' ? '#4ade80' : '#FC5D36',
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '13px',
            }}
          >
            {feedback.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <XCircle className="w-4 h-4 flex-shrink-0" />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Table header */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: '1fr 1fr 1fr auto',
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {['User', 'Granted by', 'Date', ''].map(h => (
            <span key={h} style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#FDB352' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Users className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              No users with AI access yet.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {users.map((u, i) => (
              <motion.div
                key={u.github_login}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                className="grid items-center px-5 py-4"
                style={{
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {/* User */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(253,179,82,0.15)', border: '1px solid rgba(253,179,82,0.2)' }}
                  >
                    <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', color: '#FDB352', fontWeight: 600 }}>
                      {u.github_login[0].toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                    @{u.github_login}
                  </span>
                </div>

                {/* Granted by */}
                <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                  @{u.approved_by}
                </span>

                {/* Date */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(u.granted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Revoke */}
                <button
                  onClick={() => revoke(u.github_login)}
                  title="Revoke access"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(252,93,54,0.08)',
                    border: '1px solid rgba(252,93,54,0.2)',
                    color: 'rgba(252,93,54,0.7)',
                    fontFamily: 'Instrument Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = 'rgba(252,93,54,0.15)';
                    el.style.color = '#FC5D36';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = 'rgba(252,93,54,0.08)';
                    el.style.color = 'rgba(252,93,54,0.7)';
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </main>
  );
}
