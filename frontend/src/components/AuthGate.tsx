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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0f1a' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FC5D36' }} />
      </div>
    );
  }

  if (!user?.authenticated) {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{ background: '#0a0f1a' }}
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1920&q=85&auto=format&fit=crop"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
          {/* Multi-layer overlay: dark base + brand-tinted vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg, rgba(6,11,19,0.82) 0%, rgba(6,11,19,0.65) 50%, rgba(252,93,54,0.12) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 70% 50%, rgba(253,179,82,0.06) 0%, transparent 65%)',
            }}
          />
        </div>

        {/* Announcement bar */}
        <div
          className="relative z-10 w-full text-center py-2 px-4 text-sm"
          style={{ background: 'rgba(249,186,84,0.15)', borderBottom: '1px solid rgba(249,186,84,0.25)', backdropFilter: 'blur(8px)', fontFamily: 'Instrument Sans, sans-serif', color: 'rgba(255,255,255,0.75)' }}
        >
          Prior authorization automation powered by clinical AI — Molina MCR-621 · CPT 72148 · FHIR R4
        </div>

        {/* Nav */}
        <header
          className="relative z-10 px-6 flex items-center"
          style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,11,19,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', height: '72px' }}
        >
          <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(110deg, #FDB352 0%, #FC5D36 100%)' }}
            >
              <span style={{ color: '#fff', fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '14px' }}>HP</span>
            </div>
            <span style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '18px', color: '#fff' }}>
              HealthPrior
            </span>
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: '#FDB352' }}>
              Clinical AI
            </span>
          </div>
        </header>

        {/* Login card */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm"
          >
            {/* Brand mark above card */}
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ background: 'linear-gradient(135deg, #FDB352 0%, #FC5D36 100%)', boxShadow: '0 8px 32px rgba(252,93,54,0.35)' }}
              >
                <Lock className="w-6 h-6" style={{ color: '#fff' }} />
              </div>
              <h1
                style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '30px', color: '#fff', marginBottom: '4px' }}
              >
                HealthPrior
              </h1>
              <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                Clinical AI Prior Authorization
              </p>
            </div>

            {/* Frosted glass card */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              }}
            >
              <h2
                className="text-center mb-2"
                style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 500, fontSize: '20px', color: '#fff' }}
              >
                Access Required
              </h2>
              <p
                className="text-center mb-6 leading-relaxed"
                style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}
              >
                This application is private. Sign in with your GitHub account to continue.
              </p>

              {error === 'access_denied' && (
                <div
                  className="mb-4 p-3 rounded-xl text-center text-xs"
                  style={{ background: 'rgba(252,93,54,0.15)', border: '1px solid rgba(252,93,54,0.4)', color: '#FC5D36', fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  Your GitHub account is not authorized to access this application.
                </div>
              )}

              <a
                href={loginUrl()}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-[100px] transition-all"
                style={{
                  background: '#fff',
                  color: '#000',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f0f0f0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#fff'; }}
              >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
              </a>
            </div>

            <p
              className="text-center mt-5"
              style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}
            >
              HealthPrior
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <footer
          className="relative z-10 px-6 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(6,11,19,0.4)' }}
        >
          <div className="max-w-5xl mx-auto text-center">
            <span style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
              HealthPrior
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
