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
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1427 100%)' }}>
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!user?.authenticated) {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1427 100%)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm mx-4"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-4">
              <Lock className="w-8 h-8 text-teal-400" />
            </div>
            <h1 className="text-3xl font-display text-white mb-1">HealthPrior</h1>
            <p className="text-slate-400 text-sm font-mono">Clinical AI Prior Authorization</p>
          </div>

          {/* Card */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="text-lg font-display text-white text-center mb-2">
              Access Required
            </h2>
            <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
              This application is private. Sign in with your GitHub account to continue.
            </p>

            {error === 'access_denied' && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
                Your GitHub account is not authorized to access this application.
              </div>
            )}

            <a
              href={loginUrl()}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-teal-500/50 text-slate-200 font-medium rounded-lg transition-all group"
            >
              <Github className="w-5 h-5 group-hover:text-teal-400 transition-colors" />
              <span>Continue with GitHub</span>
            </a>
          </div>

          <p className="text-center text-xs font-mono text-slate-600 mt-4">
            Latitude Health Assessment — Dmytro Volskyi
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Thin auth bar at top — shows who is logged in */}
      <div className="flex items-center justify-end gap-3 px-4 py-2 bg-slate-900/60 border-b border-slate-800/60">
        {user.avatar_url && (
          <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
        )}
        <span className="text-xs font-mono text-slate-400">{user.login}</span>
        <a
          href={logoutUrl()}
          className="text-xs font-mono text-slate-600 hover:text-red-400 transition-colors"
        >
          Sign out
        </a>
      </div>
      {children}
    </>
  );
}
