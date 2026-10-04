import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

// Conversion ratio: 1 KM = 12 minutes
const MINUTES_PER_KM = 12;

interface Props {
  onClose: () => void;
  onLog: (km: number) => Promise<void>;
}

type Phase = 'idle' | 'running' | 'paused' | 'logging' | 'done' | 'error';

const pad = (n: number) => String(n).padStart(2, '0');

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '15px',
  backgroundColor: '#000000',
  color: '#ffffff',
  borderRadius: 999,
  border: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '15px',
  backgroundColor: 'transparent',
  color: '#000000',
  borderRadius: 999,
  border: '1.5px solid rgba(0,0,0,0.2)',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const CrossTrainerTimer: React.FC<Props> = ({ onClose, onLog }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  // Elapsed time already banked from previously finished run segments
  const baseRef = useRef(0);
  // Timestamp when the currently running segment began
  const segStartRef = useRef(0);

  const liveMs = () =>
    baseRef.current + (phase === 'running' ? Date.now() - segStartRef.current : 0);

  // Tick while running
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setElapsedMs(liveMs()), 200);
    return () => clearInterval(id);
  }, [phase]);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr =
    hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;

  // KM equivalent from elapsed time (1 KM = 12 MIN)
  const km = totalSeconds / 60 / MINUTES_PER_KM;

  const handleStart = () => {
    baseRef.current = 0;
    segStartRef.current = Date.now();
    setElapsedMs(0);
    setPhase('running');
  };

  // Pause — bank the current segment, keep the timer open
  const handlePause = () => {
    baseRef.current = baseRef.current + (Date.now() - segStartRef.current);
    setElapsedMs(baseRef.current);
    setPhase('paused');
  };

  // Resume — start a new segment from the banked time
  const handleResume = () => {
    segStartRef.current = Date.now();
    setPhase('running');
  };

  // Log complete — freeze, write the KM to Supabase, then confirm
  const handleComplete = async () => {
    const ms = liveMs();
    // Bank the elapsed time so a retry (or the readout) stays stable
    baseRef.current = ms;
    setElapsedMs(ms);
    setPhase('logging');
    try {
      await onLog((ms / 1000) / 60 / MINUTES_PER_KM);
      setPhase('done');
    } catch (e) {
      console.error('Cross trainer timer log failed:', e);
      setPhase('error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', bottom: '0px', left: '10px', right: '10px',
          backgroundColor: '#F2F2ED',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{
            fontSize: '14px', fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            margin: 0,
          }}>
            Cross Trainer Timer
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#000000', lineHeight: 0 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {(phase === 'logging' || phase === 'done' || phase === 'error') ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            {phase === 'error' ? (
              <>
                <X size={44} strokeWidth={2.5} color="#b02828" />
                <div style={{
                  marginTop: 12,
                  fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.08em',
                  color: '#b02828', textTransform: 'uppercase',
                }}>
                  Log failed
                </div>
                <div style={{
                  marginTop: 6,
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                  color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center',
                }}>
                  Nothing was saved to Supabase
                  <br />
                  Check your connection and retry
                </div>
              </>
            ) : (
              <>
                <Check size={44} strokeWidth={2.5} color={phase === 'logging' ? 'rgba(0,0,0,0.25)' : '#000000'} />
                <div style={{
                  marginTop: 12,
                  fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em',
                  color: '#000000', lineHeight: 1,
                }}>
                  {km.toFixed(2)} KM
                </div>
                <div style={{
                  marginTop: 10,
                  fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em',
                  color: '#000000', textTransform: 'uppercase',
                }}>
                  {phase === 'logging' ? 'Logging…' : 'Cross Trainer logged'}
                </div>
                {phase === 'done' && (
                  <div style={{
                    marginTop: 6,
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                    color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', textAlign: 'center',
                  }}>
                    Saved to Supabase
                    <br />
                    {timeStr} elapsed · 1 km = {MINUTES_PER_KM} min
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ---------- Live readout ---------- */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{
              fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em',
              color: '#000000', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeStr}
            </div>
            <div style={{
              marginTop: 14,
              fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em',
              color: '#000000', textTransform: 'uppercase',
            }}>
              {km.toFixed(2)} KM
            </div>
            <div style={{
              marginTop: 6,
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase',
            }}>
              {phase === 'paused' ? 'Paused · ' : ''}1 km = {MINUTES_PER_KM} min
            </div>
          </div>
        )}
{/* ---------- Controls ---------- */}
        {phase === 'idle' && (
          <button onClick={handleStart} style={primaryBtn}>
            Start
          </button>
        )}

        {(phase === 'running' || phase === 'paused') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={phase === 'running' ? handlePause : handleResume}
              style={secondaryBtn}
            >
              {phase === 'running' ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleComplete}
              disabled={totalSeconds < 1}
              style={{
                ...primaryBtn,
                opacity: totalSeconds < 1 ? 0.35 : 1,
                cursor: totalSeconds < 1 ? 'default' : 'pointer',
              }}
            >
              Log Complete
            </button>
          </div>
        )}

        {phase === 'logging' && (
          <button disabled style={{ ...primaryBtn, opacity: 0.5, cursor: 'default' }}>
            Logging…
          </button>
        )}

        {phase === 'done' && (
          <button onClick={onClose} style={primaryBtn}>
            Done
          </button>
        )}

        {phase === 'error' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={secondaryBtn}>
              Close
            </button>
            <button onClick={handleComplete} style={primaryBtn}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrossTrainerTimer;