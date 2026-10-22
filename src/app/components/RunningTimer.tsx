import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

const primaryBtn: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '15px',
  backgroundColor: '#000000',
  color: '#ffffff',
  borderRadius: 999,
  border: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  textAlign: 'center',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '15px',
  backgroundColor: 'transparent',
  color: '#000000',
  borderRadius: 999,
  border: '1.5px solid rgba(0,0,0,0.2)',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  textAlign: 'center',
  cursor: 'pointer',
};

type Phase = 'idle' | 'running' | 'paused' | 'complete' | 'done' | 'error';

interface Props {
  onClose: () => void;
  onLog: (km: number, elapsedSeconds: number) => Promise<void>;
}

const RunningTimer: React.FC<Props> = ({ onClose, onLog }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [kmInput, setKmInput] = useState('');
  const [logging, setLogging] = useState(false);
  const baseRef = useRef(0);
  const segStartRef = useRef(0);

  const liveMs = () =>
    baseRef.current + (phase === 'running' ? Date.now() - segStartRef.current : 0);

  const elapsedSeconds = Math.floor(liveMs() / 1000);
  const timeStr = `${pad(Math.floor((elapsedSeconds % 3600) / 60))}:${pad(elapsedSeconds % 60)}`;

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setElapsedMs(liveMs()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const handleStart = () => {
    segStartRef.current = Date.now();
    baseRef.current = 0;
    setElapsedMs(0);
    setPhase('running');
  };

  const handlePause = () => {
    baseRef.current = baseRef.current + (Date.now() - segStartRef.current);
    setPhase('paused');
  };

  const handleResume = () => {
    segStartRef.current = Date.now();
    setPhase('running');
  };

  const handleComplete = () => {
    baseRef.current = baseRef.current + (Date.now() - segStartRef.current);
    setPhase('complete');
  };

  const handleLog = async () => {
    const km = parseFloat(kmInput);
    if (!(km > 0)) return;
    setLogging(true);
    try {
      await onLog(km, elapsedSeconds);
      setPhase('done');
    } catch (e) {
      setPhase('error');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, width: 'min(92vw, 340px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1a1a1a' }}>Running Timer</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X strokeWidth={2.5} size={20} />
          </button>
        </div>

        {phase === 'idle' && (
          <>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000000', lineHeight: 1, textAlign: 'center', marginBottom: 24, fontVariantNumeric: 'tabular-nums' }}>
              00:00
            </div>
            <button onClick={handleStart} style={primaryBtn}>
              Start
            </button>
          </>
        )}

        {(phase === 'running' || phase === 'paused') && (
          <>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000000', lineHeight: 1, textAlign: 'center', marginBottom: 24, fontVariantNumeric: 'tabular-nums' }}>
              {timeStr}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={phase === 'running' ? handlePause : handleResume} style={secondaryBtn}>
                {phase === 'running' ? 'Pause' : 'Resume'}
              </button>
              <button onClick={handleComplete} disabled={elapsedSeconds < 1} style={{ ...primaryBtn, opacity: elapsedSeconds < 1 ? 0.35 : 1, cursor: elapsedSeconds < 1 ? 'default' : 'pointer' }}>
                Complete
              </button>
            </div>
          </>
        )}

        {phase === 'complete' && (
          <>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000000', lineHeight: 1, textAlign: 'center', marginBottom: 18, fontVariantNumeric: 'tabular-nums' }}>
              {timeStr}
            </div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              KM
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={kmInput}
              onChange={e => setKmInput(e.target.value)}
              placeholder="0.0"
              style={{
                width: '100%',
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                textAlign: 'center',
                padding: '14px 0',
                border: 'none',
                borderBottom: '1.5px solid rgba(0,0,0,0.2)',
                background: 'transparent',
                color: '#1a1a1a',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <button onClick={handleLog} disabled={!(parseFloat(kmInput) > 0) || logging} style={{ ...primaryBtn, marginTop: 22, opacity: !(parseFloat(kmInput) > 0) ? 0.35 : 1, cursor: !(parseFloat(kmInput) > 0) ? 'default' : 'pointer' }}>
              {logging ? 'Logging…' : 'Log'}
            </button>
          </>
        )}

        {phase === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.2em', color: '#1a1a1a', textTransform: 'uppercase' }}>Saved</div>
            <button onClick={onClose} style={primaryBtn}>
              Done
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.2em', color: '#1a1a1a', textTransform: 'uppercase' }}>Error</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={secondaryBtn}>Close</button>
              <button onClick={handleComplete} style={primaryBtn}>Retry</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunningTimer;