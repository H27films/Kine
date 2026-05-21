import React, { useState, useEffect, useRef } from 'react';
import { supabase, todayStr, getISOWeek, getDayName, recalculateDailyTotals } from '../../lib/supabase';

const TRACKER_ID      = 82;
const ROW_ID          = 83;
const RUNNING_ID      = 84;
const WALKING_ID      = 85;
const CROSS_TRAINER_ID = 86;
const CYCLE_ID        = 87;
const CALORIES_ID     = 90;
const FOOD_ID         = 89;

const CARDIO_MAP: Record<string, number> = {
  tracker: TRACKER_ID,
  row: ROW_ID,
  rowing: ROW_ID,
  running: RUNNING_ID,
  run: RUNNING_ID,
  walking: WALKING_ID,
  walk: WALKING_ID,
  'cross trainer': CROSS_TRAINER_ID,
  crosstrainer: CROSS_TRAINER_ID,
  cycle: CYCLE_ID,
  cycling: CYCLE_ID,
};

const FOOD_OPTIONS = ['BAD', 'OK', 'GOOD'] as const;
type FoodOption = typeof FOOD_OPTIONS[number];

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const QuickLog: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const today = todayStr();
  const [trackerKm, setTrackerKm] = useState('');
  const [calories, setCalories] = useState('');
  const [foodRating, setFoodRating] = useState<FoodOption>('GOOD');
  const [foodRatingOpen, setFoodRatingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trackerMultiplier, setTrackerMultiplier] = useState<number>(1);

  // Voice state
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'success' | 'error'>('idle');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(20).fill(3));
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const multiplierRef = useRef<number>(1);

  useEffect(() => {
    multiplierRef.current = trackerMultiplier;
  }, [trackerMultiplier]);

  useEffect(() => {
    const load = async () => {
      const { data: exData } = await supabase
        .from('exercises').select('multiplier').eq('exercise_id', TRACKER_ID).maybeSingle();
      if (exData) setTrackerMultiplier(Number(exData.multiplier || 1));

      const { data: tData } = await supabase
        .from('workouts').select('km').eq('type', 'CARDIO')
        .eq('exercise_id', TRACKER_ID).eq('date', today).maybeSingle();
      if (tData && tData.km !== null) setTrackerKm(parseFloat(String(tData.km)).toFixed(1));

      const { data: cData } = await supabase
        .from('workouts').select('calories').eq('type', 'MEASUREMENT')
        .eq('exercise_id', CALORIES_ID).eq('date', today).not('calories', 'is', null).maybeSingle();
      setCalories(cData && cData.calories != null ? String(cData.calories) : '');

      const { data: fData } = await supabase
        .from('workouts').select('food_rating').eq('type', 'MEASUREMENT')
        .eq('exercise_id', FOOD_ID).eq('date', today).not('food_rating', 'is', null).maybeSingle();
      if (fData && fData.food_rating) {
        const r = String(fData.food_rating).toUpperCase();
        setFoodRating(r === 'BAD' ? 'BAD' : r === 'GOOD' ? 'GOOD' : 'OK');
      } else {
        setFoodRating('OK');
      }
    };
    load();
  }, [today]);

  const foodRatingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (foodRatingRef.current && !foodRatingRef.current.contains(e.target as Node)) {
        setFoodRatingOpen(false);
      }
    };
    if (foodRatingOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [foodRatingOpen]);

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

  const insertCardio = async (exerciseId: number, km: number, multiplier: number = 1) => {
    const week = getISOWeek(new Date(today + 'T12:00:00+08:00'));
    const day  = getDayName(new Date(today + 'T12:00:00+08:00'));
    await supabase.from('workouts').insert({
      date: today, week, day, type: 'CARDIO', exercise_id: exerciseId,
      km, total_cardio: +(km * multiplier).toFixed(2),
      total_score_k: null, new_entry: 'New', source: 'app',
    });
    await recalculateDailyTotals(today);
  };

  const saveTracker = async () => {
    const v = parseFloat(trackerKm);
    if (isNaN(v) || v <= 0) return;
    await upsert('CARDIO', TRACKER_ID, { km: v, total_cardio: +(v * trackerMultiplier).toFixed(2) });
  };
  const saveCalories = async () => {
    const v = parseInt(calories, 10);
    if (isNaN(v) || v <= 0) return;
    await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
  };
  const saveFood = async () => {
    await upsert('MEASUREMENT', FOOD_ID, { food_rating: foodRating, calories: null });
  };

  const saveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.all([saveTracker(), saveCalories(), saveFood()]);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  // ── Voice parsing ──
  const parseVoiceCommand = async (transcript: string): Promise<string> => {
    const t = transcript.toLowerCase().trim();

    // Food: "log food good/ok/bad"
    const foodMatch = t.match(/log food (good|ok|bad)/);
    if (foodMatch) {
      const rating = foodMatch[1].toUpperCase() as FoodOption;
      await upsert('MEASUREMENT', FOOD_ID, { food_rating: rating, calories: null });
      return `Food rating: ${rating} ✓`;
    }

    // Calories: "log calories 1800"
    const calMatch = t.match(/log calories (\d+)/);
    if (calMatch) {
      const v = parseInt(calMatch[1], 10);
      await upsert('MEASUREMENT', CALORIES_ID, { calories: v });
      return `Calories: ${v} kcal ✓`;
    }

    // Cardio: "log tracker/running/row/etc 10"
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

  const stopAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    setWaveAmplitudes(Array(20).fill(3));
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
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const NUM_BARS = 20;

      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / NUM_BARS);
        const amps = Array.from({ length: NUM_BARS }, (_, i) => {
          const val = dataArray[i * step] || 0;
          return 3 + (val / 255) * 40;
        });
        setWaveAmplitudes(amps);
      };
      draw();
      return true;
    } catch {
      setVoiceStatus('error');
      setVoiceMessage('Mic access denied');
      return false;
    }
  };

  const startListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('error');
      setVoiceMessage('Speech not supported in this browser');
      return;
    }

    setVoiceStatus('listening');
    setVoiceMessage('Listening…');
    setListening(true);

    const visualiserStarted = await startAudioVisualiser();
    if (!visualiserStarted) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      stopAudio();
      setVoiceMessage('Processing…');
      try {
        const result = await parseVoiceCommand(transcript);
        if (result) {
          setVoiceStatus('success');
          setVoiceMessage(result);
          setTimeout(() => {
            setVoiceOpen(false);
            setVoiceStatus('idle');
            setVoiceMessage('');
          }, 1500);
        } else {
          setVoiceStatus('error');
          setVoiceMessage(`Didn't understand: "${transcript}"`);
        }
      } catch {
        setVoiceStatus('error');
        setVoiceMessage('Failed to save');
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      stopAudio();
      setVoiceStatus('error');
      setVoiceMessage(event.error === 'no-speech' ? 'No speech detected — try again' : 'Mic error — try again');
    };

    recognition.onend = () => {
      setListening(false);
      stopAudio();
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    stopAudio();
  };

  const toggleVoice = () => {
    if (voiceOpen) {
      stopListening();
      setVoiceOpen(false);
      setVoiceStatus('idle');
      setVoiceMessage('');
    } else {
      setVoiceOpen(true);
      setVoiceStatus('idle');
      setVoiceMessage('');
      // Auto-start listening as soon as panel opens
      setTimeout(() => startListening(), 300);
    }
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopAudio();
    };
  }, []);

  const labelStyle = {
    fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
    textTransform: 'uppercase' as const, color: '#1a1a1a',
    fontFamily: "'Archivo', sans-serif",
  };

  const subLabelStyle = {
    fontSize: '8px', fontWeight: 600, color: 'rgba(26,26,26,0.45)',
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    fontFamily: "'Archivo', sans-serif", marginTop: '4px',
  };

  const inputStyle = {
    width: '100%', textAlign: 'center' as const, background: 'transparent',
    border: 'none', outline: 'none', fontFamily: "'Archivo', sans-serif",
    fontSize: '16px', fontWeight: 600, color: '#1a1a1a', padding: 0,
    letterSpacing: '-0.02em',
  };

  const glassBtn: React.CSSProperties = {
    width: '100%', padding: '8px 0', borderRadius: '9999px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    fontFamily: "'Archivo', sans-serif", fontSize: '9px', fontWeight: 700,
    letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#1a1a1a',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px', width: '100%' }}>
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
        border: '1px solid rgba(255,255,255,0.55)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04), 0 5px 12px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '14px 20px 16px 20px', boxSizing: 'border-box' as const,
      }}>
        {/* Headers */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
          {['TRACKER', 'CALORIES', 'FOOD'].map(label => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <span style={labelStyle}>{label}</span>
            </div>
          ))}
        </div>

        {/* Inputs row */}
        <div style={{ display: 'flex', gap: '12px' }}>

          {/* TRACKER */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', marginTop: '4px' }}>
              <input
                type="number" inputMode="decimal" step="0.1" placeholder="0.0"
                value={trackerKm}
                onChange={e => setTrackerKm(e.target.value)}
                style={inputStyle}
              />
            </div>
            <span style={subLabelStyle}>KM</span>
          </div>

          {/* CALORIES */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', marginTop: '4px' }}>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                style={inputStyle}
              />
            </div>
            <span style={subLabelStyle}>KCAL</span>
          </div>

          {/* FOOD */}
          <div ref={foodRatingRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: '100%', marginTop: '4px', textAlign: 'center' }}>
              <input
                type="text" readOnly value={foodRating}
                onClick={() => setFoodRatingOpen(!foodRatingOpen)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
              {foodRatingOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)',
                  left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px', overflow: 'hidden', zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 100,
                }}>
                  {FOOD_OPTIONS.map(opt => (
                    <div key={opt}
                      onClick={() => { setFoodRating(opt); setFoodRatingOpen(false); }}
                      style={{
                        padding: '11px 14px', cursor: 'pointer', fontSize: '11px',
                        fontWeight: foodRating === opt ? 700 : 400, color: '#1a1a1a',
                        backgroundColor: foodRating === opt ? 'rgba(0,0,0,0.06)' : 'transparent',
                        letterSpacing: '0.8px', textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >{opt}</div>
                  ))}
                </div>
              )}
            </div>
            <span style={subLabelStyle}>RATING</span>
          </div>

        </div>

        {/* LOG button */}
        <div style={{ marginTop: '16px' }}>
          <button onClick={saveAll} disabled={saving} style={{
            width: '100%', padding: '8px 0', borderRadius: '9999px',
            backgroundColor: saving ? 'rgba(26,26,26,0.08)' : '#1a1a1a',
            color: saving ? 'rgba(26,26,26,0.35)' : '#f2f2f2',
            fontFamily: "'Archivo', sans-serif", fontSize: '9px', fontWeight: 700,
            letterSpacing: '1.5px', textTransform: 'uppercase', border: 'none',
            cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s',
          }}>
            {saving ? 'SAVING…' : 'LOG'}
          </button>
        </div>

        {/* VOICE button */}
        <div style={{ marginTop: '8px' }}>
          <button onClick={toggleVoice} style={glassBtn}>
            {/* Soundwave icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="12" x2="2" y2="12" />
              <line x1="6" y1="8" x2="6" y2="16" />
              <line x1="10" y1="5" x2="10" y2="19" />
              <line x1="14" y1="8" x2="14" y2="16" />
              <line x1="18" y1="10" x2="18" y2="14" />
              <line x1="22" y1="12" x2="22" y2="12" />
            </svg>
            {voiceOpen ? 'CLOSE' : 'VOICE'}
          </button>
        </div>

        {/* Voice expanded area */}
        <div style={{
          overflow: 'hidden',
          maxHeight: voiceOpen ? '220px' : '0px',
          opacity: voiceOpen ? 1 : 0,
          marginTop: voiceOpen ? '8px' : '0px',
          transition: 'max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease',
        }}>
          <div style={{ paddingTop: voiceOpen ? '16px' : '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'padding 0.3s ease' }}>

            {/* Animated waveform */}
            <div style={{
              width: '100%', height: '56px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
            }}>
              {waveAmplitudes.map((amp, i) => (
                <div key={i} style={{
                  width: '3px',
                  height: `${listening ? amp : 4}px`,
                  backgroundColor: listening
                    ? `rgba(26,26,26,${0.3 + (amp / 43) * 0.7})`
                    : 'rgba(26,26,26,0.15)',
                  borderRadius: '999px',
                  transition: listening ? 'height 0.1s ease' : 'height 0.3s ease',
                }} />
              ))}
            </div>

            {/* Status text */}
            <div style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
              color: voiceStatus === 'success' ? '#1a1a1a'
                   : voiceStatus === 'error' ? 'rgba(200,50,50,0.8)'
                   : 'rgba(26,26,26,0.45)',
              fontFamily: "'Archivo', sans-serif",
              textAlign: 'center', minHeight: '14px',
              textTransform: 'uppercase',
            }}>
              {voiceMessage || 'SAY YOUR COMMAND'}
            </div>

            {/* Done button — tap when finished speaking */}
            {listening && (
              <button
                onClick={stopListening}
                style={{
                  padding: '6px 24px', borderRadius: '9999px',
                  backgroundColor: '#1a1a1a', color: '#f2f2f2',
                  fontFamily: "'Archivo', sans-serif", fontSize: '9px', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase', border: 'none',
                  cursor: 'pointer',
                }}
              >
                DONE
              </button>
            )}

            {/* Retry if error */}
            {voiceStatus === 'error' && !listening && (
              <button
                onClick={startListening}
                style={{
                  padding: '6px 24px', borderRadius: '9999px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 100%)',
                  border: '1px solid rgba(255,255,255,0.55)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  fontFamily: "'Archivo', sans-serif", fontSize: '9px', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase', color: '#1a1a1a',
                  cursor: 'pointer',
                }}
              >
                TRY AGAIN
              </button>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};