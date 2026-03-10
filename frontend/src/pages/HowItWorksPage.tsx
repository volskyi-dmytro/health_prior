import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X, Play } from 'lucide-react';

const SLIDES = Array.from({ length: 14 }, (_, i) => ({
  index: i + 1,
  src: `/slides/Slide${i + 1}.JPG`,
  label: `Slide ${i + 1}`,
}));

export function HowItWorksPage() {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setTransitioning(true);
    setImageLoaded(false);
    setTimeout(() => {
      setActive((idx + SLIDES.length) % SLIDES.length);
      setTransitioning(false);
    }, 200);
  }, []);

  const prev = useCallback(() => goTo(active - 1), [active, goTo]);
  const next = useCallback(() => goTo(active + 1), [active, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Auto-play
  useEffect(() => {
    if (playing) {
      playTimerRef.current = setInterval(() => {
        setActive(a => (a + 1) % SLIDES.length);
        setImageLoaded(false);
      }, 4000);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [playing]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const container = thumbnailRef.current;
    if (!container) return;
    const thumb = container.children[active] as HTMLElement;
    if (thumb) {
      thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [active]);

  const progressPct = ((active + 1) / SLIDES.length) * 100;

  return (
    <div
      style={{
        minHeight: fullscreen ? '100vh' : undefined,
        background: fullscreen ? '#060B13' : 'transparent',
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 9999 : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Page header — hidden in fullscreen */}
      {!fullscreen && (
        <div className="max-w-5xl mx-auto w-full px-6 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: 'rgba(252,93,54,0.15)', border: '1px solid rgba(252,93,54,0.35)' }}
            >
              <span style={{ fontSize: '11px', color: '#FC5D36', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.06em' }}>
                PRESENTATION
              </span>
            </div>
          </div>
          <h1 style={{ fontFamily: 'General Sans, sans-serif', fontWeight: 600, fontSize: '28px', color: '#fff', margin: 0 }}>
            How It Works
          </h1>
          <p style={{ fontFamily: 'Instrument Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
            A walkthrough of HealthPrior — architecture, workflow, and design rationale.
          </p>
        </div>
      )}

      {/* Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: fullscreen ? '0' : '0 24px',
          maxWidth: fullscreen ? undefined : '1024px',
          margin: fullscreen ? undefined : '0 auto',
          width: '100%',
        }}
      >
        {/* Main slide area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            background: 'rgba(6,11,19,0.85)',
            border: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: fullscreen ? '0' : '20px',
            overflow: 'hidden',
            boxShadow: fullscreen ? 'none' : '0 32px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Progress bar */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              height: '3px',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #FDB352, #FC5D36)',
              transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              zIndex: 10,
            }}
          />

          {/* Slide image */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: fullscreen ? '0' : '56.25%',
              height: fullscreen ? 'calc(100vh - 200px)' : undefined,
              background: '#0a0f1a',
            }}
          >
            <img
              key={active}
              src={SLIDES[active].src}
              alt={SLIDES[active].label}
              onLoad={() => setImageLoaded(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: transitioning || !imageLoaded ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
            {/* Loading shimmer */}
            {!imageLoaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite',
                }}
              />
            )}

            {/* Side nav overlays */}
            <button
              onClick={prev}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(6,11,19,0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s',
                zIndex: 5,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(252,93,54,0.4)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(252,93,54,0.6)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(6,11,19,0.7)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={next}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(6,11,19,0.7)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s',
                zIndex: 5,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(252,93,54,0.4)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(252,93,54,0.6)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(6,11,19,0.7)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Top-right controls */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px',
                zIndex: 5,
              }}
            >
              {/* Slide counter */}
              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: '100px',
                  background: 'rgba(6,11,19,0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.04em',
                }}
              >
                {active + 1} <span style={{ color: 'rgba(255,255,255,0.35)' }}>/ {SLIDES.length}</span>
              </div>

              {/* Play/pause */}
              <button
                onClick={() => setPlaying(p => !p)}
                title={playing ? 'Pause slideshow' : 'Play slideshow (4s per slide)'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: playing ? 'rgba(252,93,54,0.3)' : 'rgba(6,11,19,0.7)',
                  border: `1px solid ${playing ? 'rgba(252,93,54,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  color: playing ? '#FC5D36' : 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.2s',
                }}
              >
                {playing ? <X size={14} /> : <Play size={14} />}
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setFullscreen(f => !f)}
                title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(6,11,19,0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.2s',
                }}
              >
                {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(6,11,19,0.6)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <span
              style={{
                fontFamily: 'General Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              HealthPrior — Clinical AI Prior Authorization
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <kbd
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                ← →
              </kbd>
              <kbd
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                Space
              </kbd>
            </div>
          </div>
        </div>

        {/* Thumbnail filmstrip */}
        <div
          ref={thumbnailRef}
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            width: '100%',
            padding: fullscreen ? '16px 24px' : '16px 0 24px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(253,179,82,0.4) transparent',
            flexShrink: 0,
          }}
        >
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.index}
              onClick={() => goTo(idx)}
              style={{
                flexShrink: 0,
                width: '88px',
                height: '54px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: idx === active
                  ? '2px solid #FC5D36'
                  : '2px solid rgba(255,255,255,0.08)',
                background: '#0a0f1a',
                cursor: 'pointer',
                transition: 'all 0.18s',
                position: 'relative',
                padding: 0,
                boxShadow: idx === active ? '0 0 0 3px rgba(252,93,54,0.2)' : 'none',
                transform: idx === active ? 'translateY(-2px)' : 'none',
              }}
              onMouseEnter={e => {
                if (idx !== active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(253,179,82,0.5)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (idx !== active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }
              }}
            >
              <img
                src={slide.src}
                alt={slide.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Slide number badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '3px',
                  right: '4px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: idx === active ? '#FC5D36' : 'rgba(255,255,255,0.4)',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {idx + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
