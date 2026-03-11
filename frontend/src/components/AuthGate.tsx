import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Lock, Loader2, ShieldOff, Users, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { getMe, loginUrl, logoutUrl, listAllowedUsers, grantAiAccess, revokeAiAccess, type AuthUser, type AllowedUser } from '../api/healthprior';

interface Props {
  children: React.ReactNode;
}

// ─── Shared token strip ──────────────────────────────────────────────────────

function AnnouncementBar() {
  return (
    <div
      className="relative z-10 w-full text-center py-2 px-4 text-sm"
      style={{
        background: 'rgba(249,186,84,0.12)',
        borderBottom: '1px solid rgba(249,186,84,0.2)',
        backdropFilter: 'blur(8px)',
        fontFamily: 'Instrument Sans, sans-serif',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.01em',
      }}
    >
      Prior authorization automation powered by clinical AI — Molina MCR-621 · CPT 72148 · FHIR R4
    </div>
  );
}

function NavHeader() {
  return (
    <header
      className="relative z-10 px-6 flex items-center"
      style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(6,11,19,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        height: '72px',
      }}
    >
      <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(110deg,#FDB352 0%,#FC5D36 100%)', boxShadow: '0 4px 14px rgba(252,93,54,0.35)' }}
        >
          <span style={{ color: '#fff', fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '14px' }}>HP</span>
        </div>
        <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#fff' }}>
          HealthPrior
        </span>
        <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#FDB352', opacity: 0.9 }}>
          Clinical AI
        </span>
      </div>
    </header>
  );
}

function PageFooter() {
  return (
    <footer
      className="relative z-10 px-6 py-4"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(6,11,19,0.4)',
      }}
    >
      <div className="max-w-5xl mx-auto text-center">
        <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          HealthPrior
        </span>
      </div>
    </footer>
  );
}

function BackgroundScene() {
  return (
    <div className="absolute inset-0">
      <img
        src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1920&q=85&auto=format&fit=crop"
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover"
        style={{ objectPosition: 'center 35%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg,rgba(6,11,19,0.88) 0%,rgba(6,11,19,0.72) 50%,rgba(252,93,54,0.1) 100%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 70% 50%,rgba(253,179,82,0.05) 0%,transparent 65%)' }}
      />
    </div>
  );
}

function FullPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#0a0f1a' }}>
      <BackgroundScene />
      <AnnouncementBar />
      <NavHeader />
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
      <PageFooter />
    </div>
  );
}

// ─── Glass card primitive ────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.11)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Admin panel ─────────────────────────────────────────────────────────────

type FeedbackState = { type: 'success' | 'error'; msg: string } | null;

function AdminPanel() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [newLogin, setNewLogin] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
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
      showFeedback('success', `@${login} granted AI access`);
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
      showFeedback('success', `@${login} revoked`);
      reload();
    } catch (e: unknown) {
      showFeedback('error', e instanceof Error ? e.message : 'Failed to revoke');
    }
  };

  return (
    <div
      className="rounded-xl p-5 mt-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4" style={{ color: '#FDB352' }} />
        <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
          AI Access Management
        </span>
      </div>

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
            style={{
              background: feedback.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(252,93,54,0.12)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(252,93,54,0.3)'}`,
              color: feedback.type === 'success' ? '#4ade80' : '#FC5D36',
              fontFamily: 'Instrument Sans, sans-serif',
            }}
          >
            {feedback.type === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            }
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grant input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newLogin}
          onChange={e => setNewLogin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && grant()}
          placeholder="GitHub username"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#fff',
            fontFamily: 'Instrument Sans, sans-serif',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(253,179,82,0.5)'; }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.13)'; }}
        />
        <button
          onClick={grant}
          disabled={saving || !newLogin.trim()}
          className="flex items-center gap-1.5"
          style={{
            background: saving || !newLogin.trim()
              ? 'rgba(253,179,82,0.2)'
              : 'linear-gradient(110deg,#FDB352,#FC5D36)',
            color: saving || !newLogin.trim() ? 'rgba(255,255,255,0.4)' : '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontFamily: 'Instrument Sans, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            cursor: saving || !newLogin.trim() ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? 'Adding…' : 'Grant'}
        </button>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FDB352' }} />
        </div>
      ) : users.length === 0 ? (
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px 0' }}>
          No users with AI access yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {users.map(u => (
              <motion.div
                key={u.github_login}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex flex-col">
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                    @{u.github_login}
                  </span>
                  <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    granted by @{u.approved_by}
                  </span>
                </div>
                <button
                  onClick={() => revoke(u.github_login)}
                  title="Revoke access"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(252,93,54,0.5)',
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FC5D36'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(252,93,54,0.5)'; }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f1a' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(110deg,#FDB352 0%,#FC5D36 100%)', boxShadow: '0 6px 24px rgba(252,93,54,0.3)' }}
        >
          <span style={{ color: '#fff', fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '16px' }}>HP</span>
        </div>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(253,179,82,0.6)' }} />
      </motion.div>
    </div>
  );
}

// ─── Main gate ───────────────────────────────────────────────────────────────

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(u => { setUser(u); setLoading(false); });
  }, []);

  if (loading) return <LoadingScreen />;

  // Public routes — accessible without authentication
  if (window.location.pathname === '/how-it-works') return <>{children}</>;


  // ── Not logged in ──
  if (!user?.authenticated) {
    const error = new URLSearchParams(window.location.search).get('error');
    return (
      <FullPageLayout>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Brand mark */}
          <div className="text-center mb-7">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{
                background: 'linear-gradient(135deg,#FDB352 0%,#FC5D36 100%)',
                boxShadow: '0 8px 32px rgba(252,93,54,0.3)',
              }}
            >
              <Lock className="w-6 h-6" style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '28px', color: '#fff', marginBottom: '4px' }}>
              HealthPrior
            </h1>
            <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
              Clinical AI Prior Authorization
            </p>
          </div>

          <GlassCard className="p-8">
            <h2
              className="text-center mb-2"
              style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '19px', color: '#fff' }}
            >
              Access Required
            </h2>
            <p
              className="text-center mb-6 leading-relaxed"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}
            >
              Sign in with your GitHub account to continue.
            </p>

            {error === 'access_denied' && (
              <div
                className="mb-4 p-3 rounded-xl text-center text-xs"
                style={{
                  background: 'rgba(252,93,54,0.12)',
                  border: '1px solid rgba(252,93,54,0.35)',
                  color: '#FC5D36',
                  fontFamily: 'Instrument Sans, sans-serif',
                }}
              >
                Your GitHub account is not authorized to access this application.
              </div>
            )}

            <a
              href={loginUrl()}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-[100px]"
              style={{
                background: '#fff',
                color: '#0a0f1a',
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                transition: 'background 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = '#f0f0f0';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = '#fff';
                el.style.transform = 'translateY(0)';
              }}
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </a>
          </GlassCard>

          <p
            className="text-center mt-5"
            style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}
          >
            HealthPrior
          </p>
        </motion.div>
      </FullPageLayout>
    );
  }

  // ── Logged in, no AI access ──
  if (!user.ai_access) {
    return (
      <FullPageLayout>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8">
            {/* Avatar + identity */}
            <div className="flex flex-col items-center text-center mb-6">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-14 h-14 rounded-full mb-4"
                  style={{ border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
                />
              )}
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                style={{ background: 'rgba(252,93,54,0.12)', border: '1px solid rgba(252,93,54,0.25)' }}
              >
                <ShieldOff className="w-5 h-5" style={{ color: '#FC5D36' }} />
              </div>
              <h2
                style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '20px', color: '#fff', marginBottom: '6px' }}
              >
                Hi, @{user.login}
              </h2>
              <p
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: '300px' }}
              >
                You're authenticated, but AI-powered features require explicit access. Contact the administrator to request access.
              </p>
            </div>

            {/* Admin panel — only visible to the admin */}
            {user.is_admin && <AdminPanel />}

            {/* Sign out */}
            <a
              href={logoutUrl()}
              className="flex items-center justify-center w-full py-2.5 mt-5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '13px',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.09)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'rgba(255,255,255,0.09)';
                el.style.color = 'rgba(255,255,255,0.7)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.color = 'rgba(255,255,255,0.45)';
              }}
            >
              Sign out
            </a>
          </GlassCard>
        </motion.div>
      </FullPageLayout>
    );
  }

  // ── Full access ──
  return (
    <>
      <div
        className="flex items-center justify-end gap-3 px-6 py-2 border-b"
        style={{ background: '#FFF6EA', borderColor: 'rgba(253,179,82,0.28)' }}
      >
        {user.avatar_url && (
          <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
        )}
        {user.is_admin && (
          <span
            style={{
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              color: '#FC5D36',
              background: 'rgba(252,93,54,0.1)',
              padding: '2px 8px',
              borderRadius: '100px',
              border: '1px solid rgba(252,93,54,0.25)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            admin
          </span>
        )}
        <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
          {user.login}
        </span>
        <a
          href={logoutUrl()}
          style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#9ca3af', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#FC5D36'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
        >
          Sign out
        </a>
      </div>
      {children}
    </>
  );
}
