import React from 'react';
import { Exercise } from '../../lib/supabase';

interface Props {
  exercises: Exercise[];
  selectedExercise: Exercise | null;
  onSelect: (ex: Exercise | null) => void;
}

type IconKey = 'running' | 'rowing' | 'walking' | 'cycling' | 'crosstrainer';

const ICON_KEYS: IconKey[] = ['running', 'rowing', 'walking', 'cycling', 'crosstrainer'];

const MATCH_KEYWORDS: Record<IconKey, string> = {
  running: 'run',
  rowing: 'row',
  walking: 'walk',
  cycling: 'cycl',
  crosstrainer: 'cross',
};

const DISPLAY_NAMES: Record<IconKey, string> = {
  running: 'RUNNING',
  rowing: 'ROWING',
  walking: 'WALKING',
  cycling: 'CYCLING',
  crosstrainer: 'CROSS TRAINER',
};

const IconSVG: React.FC<{ iconKey: IconKey; color: string }> = ({ iconKey, color: c }) => {
  switch (iconKey) {
    case 'running':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <circle cx="72" cy="22" r="6" fill={c}/>
          <path d="M48 38L65 28L75 35L85 45" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 28L55 45L40 38" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L65 65L70 85" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L45 55L22 62" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'rowing':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <circle cx="50" cy="25" r="6" fill={c}/>
          <path d="M50 31L45 50L55 55L65 45" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 50L40 65H55" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 45L78 45V33" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25 68H80" stroke={c} strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'walking':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <circle cx="50" cy="18" r="7" fill={c}/>
          <path d="M50 25L42 50L30 62" stroke={c} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M42 50L58 55" stroke={c} strokeWidth="6" strokeLinecap="round"/>
          <path d="M50 25L60 38L72 42" stroke={c} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M42 50L38 68L30 82" stroke={c} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M42 50L52 68L60 82" stroke={c} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'cycling':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <circle cx="25" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <circle cx="75" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <path d="M25 70L45 45H65L75 70" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 45L55 30H65" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="55" cy="25" r="5" fill={c}/>
        </svg>
      );
    case 'crosstrainer':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <circle cx="47" cy="18" r="6" fill={c}/>
          <path d="M47 24L40 45" stroke={c} strokeWidth="8" strokeLinecap="round"/>
          <path d="M47 26L55 36L62 36" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M47 26L35 33L28 40" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L45 56L52 68" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L34 60L28 72" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="20" y="74" width="50" height="7" rx="2" fill={c}/>
        </svg>
      );
  }
};

const ExerciseIconBar: React.FC<Props> = ({ exercises, selectedExercise, onSelect }) => {
  const selectedKey = selectedExercise
    ? ICON_KEYS.find(key =>
        selectedExercise.exercise_name?.toLowerCase().includes(MATCH_KEYWORDS[key])
      )
    : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {ICON_KEYS.map(key => {
          const ex = exercises.find(e =>
            e.exercise_name?.toLowerCase().includes(MATCH_KEYWORDS[key])
          );
          const isSelected = selectedKey === key;
          const color = isSelected ? '#000000' : '#ffffff';
          const bg = isSelected ? '#ffffff' : 'rgba(255,255,255,0.18)';
          return (
            <button
              key={key}
              onClick={() => ex ? onSelect(isSelected ? null : ex) : undefined}
              style={{
                width: '17vw',
                height: '17vw',
                maxWidth: 68,
                maxHeight: 68,
                borderRadius: '50%',
                backgroundColor: bg,
                border: 'none',
                cursor: ex ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20%',
                flexShrink: 0,
                opacity: ex ? 1 : 0.35,
              }}
            >
              <IconSVG iconKey={key} color={color} />
            </button>
          );
        })}
      </div>

      {/* Exercise name label */}
      <div style={{
        height: 22,
        marginTop: 10,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: selectedKey ? 'rgba(255,255,255,0.85)' : 'transparent',
      }}>
        {selectedKey ? DISPLAY_NAMES[selectedKey] : '·'}
      </div>
    </div>
  );
};

export default ExerciseIconBar;
