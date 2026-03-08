import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Lock, Loader2 } from 'lucide-react';
import { getMe, loginUrl, logoutUrl, type AuthUser } from '../api/healthprior';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F5' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FC5D36' }} />
      </div>
    );
  }

  if (!user?.authenticated) {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#FAF9F5' }}>
        {/* Announcement bar */}
        <div
          className="w-full text-center py-2 px-4 text-sm"
          style={{ background: '#F9BA54', fontFamily: 'Instrument Sans, sans-serif', color: '#000' }}
        >
          Prior authorization automation powered by clinical AI — Molina MCR-621 · CPT 72148 · FHIR R4
        </div>

        {/* Nav */}
        <header
          className="border-b px-6 flex items-center"
          style={{ background: '#FFFFFF', borderColor: '#e5e7eb', height: '72px' }}
        >
          <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)' }}
            >
              <span style={{ color: '#fff', fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '14px' }}>HP</span>
            </div>
            <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#000' }}>
              HealthPrior
            </span>
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#FC5D36' }}>
              Clinical AI
            </span>
          </div>
        </header>

        {/* Login card */}
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.25)' }}
              >
                <Lock className="w-8 h-8" style={{ color: '#FC5D36' }} />
              </div>
              <h1
                style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '32px', color: '#000', marginBottom: '6px' }}
              >
                HealthPrior
              </h1>
              <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '15px', color: '#6b7280' }}>
                Clinical AI Prior Authorization
              </p>
            </div>

            {/* Card */}
            <div
              className="rounded-2xl p-8"
              style={{ background: '#FFFFFF', border: '1px solid #e5e7eb' }}
            >
              <h2
                className="text-center mb-2"
                style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '20px', color: '#000' }}
              >
                Access Required
              </h2>
              <p
                className="text-center mb-6 leading-relaxed"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: '#6b7280' }}
              >
                This application is private. Sign in with your GitHub account to continue.
              </p>

              {error === 'access_denied' && (
                <div
                  className="mb-4 p-3 rounded-xl text-center text-xs"
                  style={{ background: 'rgba(252,93,54,0.08)', border: '1px solid rgba(252,93,54,0.3)', color: '#FC5D36', fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Your GitHub account is not authorized to access this application.
                </div>
              )}

              <a
                href={loginUrl()}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-[100px] transition-all"
                style={{
                  background: '#000',
                  color: '#fff',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(0.85)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'none'; }}
              >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
              </a>
            </div>

            <p
              className="text-center mt-4"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}
            >
              Latitude Health Assessment — Dmytro Volskyi
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="border-t px-6 py-4" style={{ borderColor: '#e5e7eb', background: '#FFFFFF' }}>
          <div className="max-w-5xl mx-auto text-center">
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#9ca3af' }}>
              HealthPrior v1.0 — Latitude Health Assessment
            </span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      {/* Thin auth bar */}
      <div
        className="flex items-center justify-end gap-3 px-6 py-2 border-b"
        style={{ background: '#FFF6EA', borderColor: 'rgba(253,179,82,0.3)' }}
      >
        {user.avatar_url && (
          <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
        )}
        <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#363636' }}>
          {user.login}
        </span>
        <a
          href={logoutUrl()}
          style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '13px', color: '#9ca3af' }}
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
