import React, { useState, useEffect, useRef } from 'react';
import { X, Footprints } from 'lucide-react';
import { CaloriesIcon, RunningManIcon } from './NavIcons';
import { supabase, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';
import { VoiceVisualiser } from './VoiceVisualiser';

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
  onSuccess?: () => void;
}

export const QuickLogVoice: React.FC<QuickLogVoiceProps> = ({ multiplier, onClose, onSuccess }) => {
  const today = todayStr();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const multiplierRef = useRef<number>(multiplier);
  const closedRef = useRef(false);

  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);

  // ====== CLEANUP ======

  /** Full cleanup: abort recognition. */
  const forceCleanup = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  };

  // ====== SUPABASE ======

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

  // ====== VOICE PARSING ======

  const parseVoiceCommand = async (transcript: string): Promise<string> => {
    const t = transcript.toLowerCase().trim();

    // --- FOOD RATING ---
    const foodMatch = t.match(/(?:log\s+)?(?:my\s+)?food\s+(?:was\s+)?(good|ok|bad)\b/);
    if (foodMatch) {
      const rating = foodMatch[1].toUpperCase();
      await upsert('MEASUREMENT', FOOD_ID, { food_rating: rating, calories: null });
      return `Food rating: ${rating} ✓`;
    }
    const foodMatch2 = t.match(/(?:food|meal|ate|eating)\s+(?:was|is)\s+(good|ok|okay|bad)\b/);
    if (foodMatch2) {
      let rating = foodMatch2[1].toUpperCase();
      if (rating === 'OKAY') rating = 'OK';
      await upsert('MEASUREMENT', FOOD_ID, { food_rating: rating, calories: null });
      return `Food rating: ${rating} ✓`;
    }

    // --- CALORIES ---
    const calMatch = t.match(/(?:log\s+)?(?:(?:i\s+)?(?:had|ate|consumed|took)\s+)?(\d{3,4})\s*cal/);
    if (calMatch) {
      const v = parseInt(calMatch[1], 10);
      await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
      return `Calories: ${v} kcal ✓`;
    }
    const calMatch2 = t.match(/log calories\s+(\d+)/);
    if (calMatch2) {
      const v = parseInt(calMatch2[1], 10);
      await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
      return `Calories: ${v} kcal ✓`;
    }

    // --- CARDIO ---
    const allCardioNames = Object.keys(CARDIO_MAP).join('|');

    const cardioMatch1 = t.match(new RegExp(`(?:log\\s+)?(${allCardioNames})\\s+(\\d+(?:\\.\\d+)?)\\s*k?`, 'i'));
    if (cardioMatch1) {
      const exerciseName = cardioMatch1[1].toLowerCase();
      const km = parseFloat(cardioMatch1[2]);
      const exerciseId = CARDIO_MAP[exerciseName];
      if (exerciseId && !isNaN(km) && km > 0) {
        if (exerciseId === TRACKER_ID) {
          await upsert('CARDIO', TRACKER_ID, { km, total_cardio: +(km * multiplierRef.current).toFixed(2) });
        } else {
          await insertCardio(exerciseId, km);
        }
        return `${exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1)}: ${km} km ✓`;
      }
    }

    const actionMap: Record<string, string> = {
      ran: 'running', run: 'running', running: 'running',
      walked: 'walking', walk: 'walking', walking: 'walking',
      rowed: 'row', row: 'row', rowing: 'row',
      cycled: 'cycle', cycle: 'cycle', cycling: 'cycle',
      tracked: 'tracker',
    };
    const actionPattern = Object.keys(actionMap).join('|');
    const cardioMatch2 = t.match(new RegExp(`(?:i\\s+)?(${actionPattern})\\s+(\\d+(?:\\.\\d+)?)\\s*(?:k|km|kilometers|kilometres|klicks)?`, 'i'));
    if (cardioMatch2) {
      const action = cardioMatch2[1].toLowerCase();
      const canonical = actionMap[action];
      const km = parseFloat(cardioMatch2[2]);
      const exerciseId = CARDIO_MAP[canonical] || CARDIO_MAP[canonical.replace(/ing$/, '') || ''];
      if (exerciseId && !isNaN(km) && km > 0) {
        if (exerciseId === TRACKER_ID) {
          await upsert('CARDIO', TRACKER_ID, { km, total_cardio: +(km * multiplierRef.current).toFixed(2) });
        } else {
          await insertCardio(exerciseId, km);
        }
        return `${canonical.charAt(0).toUpperCase() + canonical.slice(1)}: ${km} km ✓`;
      }
    }

    const cardioMatch3 = t.match(/(?:i\s+)?did\s+(\d+(?:\.\d+)?)\s*(?:k|km|kilometers|kilometres)?\s+(?:on\s+)?(?:the\s+)?(tracker|row|rowing|running|run|walking|walk|cross trainer|crosstrainer|cycle|cycling)\b/);
    if (cardioMatch3) {
      const km = parseFloat(cardioMatch3[1]);
      let exerciseName = cardioMatch3[2].toLowerCase();
      const exerciseId = CARDIO_MAP[exerciseName];
      if (exerciseId && !isNaN(km) && km > 0) {
        if (exerciseId === TRACKER_ID) {
          await upsert('CARDIO', TRACKER_ID, { km, total_cardio: +(km * multiplierRef.current).toFixed(2) });
        } else {
          await insertCardio(exerciseId, km);
        }
        return `${exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1)}: ${km} km ✓`;
      }
    }

    return '';
  };

  // ====== SPEECH RECOGNITION ======

  const startListening = async () => {
    if (closedRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      setMessage('Speech not supported in this browser');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    setStatus('listening');
    setMessage('Listening…');
    setListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let handled = false;
    recognitionRef.current = recognition;

    recognition.onresult = async (event: any) => {
      if (handled || closedRef.current) return;
      handled = true;
      recognitionRef.current = null;

      const transcript = event.results[0][0].transcript;
      setListening(false);
      setStatus('processing');
      setMessage(`"${transcript}"`);

      try {
        const result = await parseVoiceCommand(transcript);
        if (closedRef.current) return;
        if (result) {
          setStatus('success');
          setMessage(result);
          setTimeout(() => {
            forceCleanup();
            onSuccess?.();
            onClose();
          }, 1800);
        } else {
          setStatus('error');
          setMessage(`"${transcript}"\n\u2716 Didn't understand`);
        }
      } catch {
        if (!closedRef.current) {
          setStatus('error');
          setMessage('Failed to save');
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (handled || closedRef.current) return;
      handled = true;
      recognitionRef.current = null;
      setListening(false);
      setStatus('error');
      const msg = event.error === 'no-speech' ? 'No speech detected'
        : event.error === 'aborted' ? 'Tap START to try again'
        : 'ERROR — TRY AGAIN';
      setMessage(msg);
    };

    recognition.onend = () => {
      if (handled || closedRef.current) return;
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const handleClose = () => {
    closedRef.current = true;
    forceCleanup();
    setListening(false);
    onClose();
  };

  useEffect(() => {
    closedRef.current = false;
    return () => {
      closedRef.current = true;
      forceCleanup();
    };
  }, []);

  const statusColor =
  status === 'success' ? '#1a1a1a'
  : status === 'error' ? '#1a1a1a'
  : 'rgba(26,26,26,0.9)';

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

      <div style={{
  fontSize: '24px', fontWeight: 500, letterSpacing: '12px',
  textTransform: 'uppercase', color: '#1a1a1a',
  marginBottom: '48px',
}}>
  VOICE LOG
</div>

      <VoiceVisualiser
  listening={listening}
  status={status}
/>

      <div style={{
        fontSize: '14px',
        fontWeight: 400,
        letterSpacing: '0.08em',
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

      {(status === 'idle' || status === 'error' || status === 'listening') && (
  <button
    onClick={listening ? stopListening : startListening}
    style={{
      padding: '10px 40px', borderRadius: '9999px',
      backgroundColor: listening ? '#1a1a1a' : 'transparent',
      color: listening ? '#f2f2f2' : '#1a1a1a',
      border: listening ? 'none' : '1px solid rgba(26,26,26,0.2)',
      fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px',
      textTransform: 'uppercase', cursor: 'pointer',
    }}
  >
    {listening ? 'DONE' : status === 'error' ? 'TRY AGAIN' : 'START'}
  </button>
)}

      <div style={{
  position: 'absolute', bottom: 'calc(32px + env(safe-area-inset-bottom))',
  display: 'flex', gap: '32px', alignItems: 'flex-start', justifyContent: 'center',
}}>
  {[
    { icon: <Footprints size={24} color="rgba(26,26,26,0.9)" strokeWidth={1.5} />, label: 'LOG TRACKER 15' },
    { icon: <CaloriesIcon size={24} color="rgba(26,26,26,0.9)" />, label: 'LOG CALORIES 1250' },
    { icon: <RunningManIcon size={26} color="rgba(26,26,26,0.9)" />, label: 'LOG RUNNING 5' },
  ].map(({ icon, label }) => (
    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {icon}
      <span style={{
        fontSize: '7.5px', fontWeight: 500, letterSpacing: '0.08em',
        color: 'rgba(26,26,26,0.75)', textTransform: 'uppercase', textAlign: 'center',
        lineHeight: 1.4, maxWidth: '72px', whiteSpace: 'pre-line',
      }}>
        {label}
      </span>
    </div>
  ))}
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