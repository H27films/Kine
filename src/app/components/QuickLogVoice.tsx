import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';

const TRACKER_ID       = 82;
const ROW_ID           = 83;
const RUNNING_ID       = 84;
const WALKING_ID       = 85;
const CROSS_TRAINER_ID = 86;
const CYCLE_ID         = 87;
const CALORIES_ID      = 90;
const FOOD_ID          = 89;

const CARDIO_MAP: Record<string, number> = {
  tracker: TRACKER_ID,
  row: ROW_ID, rowing: ROW_ID,
  running: RUNNING_ID, run: RUNNING_ID,
  walking: WALKING_ID, walk: WALKING_ID,
  'cross trainer': CROSS_TRAINER_ID, crosstrainer: CROSS_TRAINER_ID,
  cycle: CYCLE_ID, cycling: CYCLE_ID,
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface QuickLogVoiceProps {
  multiplier: number;
  onClose: () => void;
}

export const QuickLogVoice: React.FC<QuickLogVoiceProps> = ({ multiplier, onClose }) => {
  const today = todayStr();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(32).fill(3));

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const multiplierRef = useRef<number>(multiplier);

  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);

  const stopAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current = null;
    setWaveAmplitudes(Array(32).fill(3));
  };

  const startAudioVisualiser = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const NUM_BARS = 32;
      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / NUM_BARS);
        const amps = Array.from({ length: NUM_BARS }, (_, i) => {
          const val = dataArray[i * step] || 0;
          return 3 + (val / 255) * 80;
        });
        setWaveAmplitudes(amps);
      };
      draw();
      return true;
    } catch {
      setStatus('error');
      setMessage('Mic access denied');
      return false;
    }
  };

  const upsert = async (type: string, exerciseId: number, payload: Record<string, unknown>) => {
    const week = getISOWeek(new Date(today + 'T12:00:00+08:00'));
    const day  = getDayName(new Date(today + 'T12:00:00+08:00'));
    const { data: existing } = await supabase
      .from('workouts').select('id')
      .eq('type', type).eq('exercise_id', exerciseId).eq('date', today).maybeSingle();
    if (existing) {
      await supabase.from('workouts').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('workouts').insert({
        date: today, week, day, type, exercise_id: exerciseId,
        total_score_k: null, new_entry: 'New', source: 'app', ...payload,
      });
    }
    await recalculateDailyTotals(today);
  };

  const insertCardio = async (exerciseId: number, km: number) => {
    const week = getISOWeek(new Date(today + 'T12:00:00+08:00'));
    const day  = getDayName(new Date(today + 'T12:00:00+08:00'));
    await supabase.from('workouts').insert({
      date: today, week, day, type: 'CARDIO', exercise_id: exerciseId,
      km, total_cardio: +(km * 1).toFixed(2),
      total_score_k: null, new_entry: 'New', source: 'app',
    });
    await recalculateDailyTotals(today);
  };

  const parseVoiceCommand = async (transcript: string): Promise<string> => {
    const t = transcript.toLowerCase().trim();

    const foodMatch = t.match(/log food (good|ok|bad)/);
    if (foodMatch) {
      const rating = foodMatch[1].toUpperCase();
      await upsert('MEASUREMENT', FOOD_ID, { food_rating: rating, calories: null });
      return `Food rating: ${rating} ✓`;
    }

    const calMatch = t.match(/log calories (\d+)/);
    if (calMatch) {
      const v = parseInt(calMatch[1], 10);
      await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
      return `Calories: ${v} kcal ✓`;
    }

    const cardioMatch = t.match(/log (tracker|row|rowing|running|run|walking|walk|cross trainer|crosstrainer|cycle|cycling)\s+([\d.]+)/);
    if (cardioMatch) {
      const exerciseName = cardioMatch[1];
      const km = parseFloat(cardioMatch[2]);
      const exerciseId = CARDIO_MAP[exerciseName];
      if (exerciseId && !isNaN(km) && km > 0) {
        if (exerciseId === TRACKER_ID) {
          await upsert('CARDIO', TRACKER_ID, { km, total_cardio: +(km * multiplierRef.current).toFixed(2) });
        } else {
          await insertCardio(exerciseId, km);
        }
        const label = exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1);
        return `${label}: ${km} km ✓`;
      }
    }

    return '';
  };

  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      setMessage('Speech not supported in this browser');
      return;
    }

    setStatus('listening');
    setMessage('Listening…');
    setListening(true);

    const ok = await startAudioVisualiser();
    if (!ok) { setListening(false); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    let handled = false;

    recognition.onresult = async (event: any) => {
      if (handled) return;
      handled = true;
      const transcript = event.results[0][0].transcript;
      setListening(false);
      stopAudio();
      setStatus('processing');
      setMessage(`"${transcript}"`);
      try {
        const result = await parseVoiceCommand(transcript);
        if (result) {
          setStatus('success');
          setMessage(result);
          setTimeout(() => onClose(), 1800);
        } else {
          setStatus('error');
          setMessage(`Didn't understand — try again`);
        }
      } catch {
        setStatus('error');
        setMessage('Failed to save');
      }
    };

    recognition.onerror = (event: any) => {
      if (handled) return;
      handled = true;
      setListening(false);
      stopAudio();
      setStatus('error');
      setMessage(event.error === 'no-speech' ? 'No speech detected' : 'Mic error — try again');
    };

    recognition.onend = () => {
      if (handled) return;
      setListening(false);
      stopAudio();
    };

    recognition.start();
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setListening(false);
    stopAudio();
  };

  const handleClose = () => {
    stopListening();
    onClose();
  };

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(() => startListening(), 300);
    return () => {
      clearTimeout(t);
      stopListening();
    };
  }, []);

  const statusColor =
    status === 'success' ? '#1a1a1a'
    : status === 'error' ? 'rgba(200,50,50,0.9)'
    : 'rgba(26,26,26,0.45)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(242,242,242,0.96)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: "'Archivo', sans-serif",
      animation: 'vFadeIn 0.2s ease',
    }}>

      {/* X close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute', top: 'calc(20px + env(safe-area-inset-top))', right: '20px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
          color: '#1a1a1a', opacity: 0.5,
        }}
      >
        <X size={22} strokeWidth={1.8} />
      </button>

      {/* Title */}
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
        textTransform: 'uppercase', color: 'rgba(26,26,26,0.35)',
        marginBottom: '48px',
      }}>
        VOICE LOG
      </div>

      {/* Waveform */}
      <div style={{
        width: '100%', maxWidth: '360px', height: '100px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
        marginBottom: '40px',
      }}>
        {waveAmplitudes.map((amp, i) => (
          <div key={i} style={{
            width: '4px',
            height: `${listening ? Math.max(4, amp) : 4}px`,
            backgroundColor: listening
              ? `rgba(26,26,26,${0.2 + (amp / 83) * 0.8})`
              : status === 'success'
              ? 'rgba(26,26,26,0.3)'
              : 'rgba(26,26,26,0.12)',
            borderRadius: '999px',
            transition: listening ? 'height 0.08s ease' : 'height 0.4s ease',
          }} />
        ))}
      </div>

      {/* Status message */}
      <div style={{
        fontSize: status === 'processing' || status === 'success' || status === 'error' ? '14px' : '11px',
        fontWeight: 600,
        letterSpacing: status === 'processing' || status === 'success' || status === 'error' ? '0.02em' : '0.12em',
        color: statusColor,
        textAlign: 'center',
        minHeight: '24px',
        textTransform: status === 'listening' || status === 'idle' ? 'uppercase' : 'none',
        marginBottom: '32px',
        maxWidth: '280px',
        lineHeight: 1.4,
      }}>
        {message || 'Say your command'}
      </div>

      {/* DONE button while listening */}
      {listening && (
        <button
          onClick={stopListening}
          style={{
            padding: '10px 40px', borderRadius: '9999px',
            backgroundColor: '#1a1a1a', color: '#f2f2f2',
            fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', border: 'none', cursor: 'pointer',
          }}
        >
          DONE
        </button>
      )}

      {/* TRY AGAIN on error */}
      {status === 'error' && !listening && (
        <button
          onClick={startListening}
          style={{
            padding: '10px 40px', borderRadius: '9999px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)',
            border: '1px solid rgba(255,255,255,0.7)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: '#1a1a1a', cursor: 'pointer',
          }}
        >
          TRY AGAIN
        </button>
      )}

      {/* Hint text */}
      <div style={{
        position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom))',
        fontSize: '9px', fontWeight: 500, letterSpacing: '0.1em',
        color: 'rgba(26,26,26,0.25)', textTransform: 'uppercase', textAlign: 'center',
        lineHeight: 1.8,
      }}>
        "Log tracker 10" · "Log calories 1800"
      </div>

      <style>{`
        @keyframes vFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};