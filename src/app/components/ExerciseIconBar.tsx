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

// SVG icon — explicit 24×24 pixels, paths from uploaded files
const IconSVG: React.FC<{ iconKey: IconKey; color: string }> = ({ iconKey, color: c }) => {
  switch (iconKey) {
    case 'running':
      return (
        <svg width={24} height={24} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="18" width="35" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="28" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="5"  y="38" width="30" height="3" rx="1.5" fill={c}/>
          <rect x="20" y="48" width="25" height="3" rx="1.5" fill={c}/>
          <rect x="15" y="58" width="25" height="3" rx="1.5" fill={c}/>
          <circle cx="72" cy="22" r="6" fill={c}/>
          <path d="M48 38L65 28L75 35L85 45" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 28L55 45L40 38"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L65 65L70 85"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M55 45L45 55L22 62"        stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'rowing':
      return (
        <svg width={24} height={24} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="25" r="5" fill={c}/>
          <path d="M50 30L45 50L55 55L65 45" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 50L40 60H55"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M65 45L75 45V35"          stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 65H80"                stroke={c} strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'walking':
      return (
        <svg width={24} height={24} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 70C40 80 30 85 25 80C20 75 25 60 30 50C35 40 45 40 45 50C45 60 40 60 40 70Z" fill={c}/>
          <circle cx="25" cy="40" r="3" fill={c}/>
          <circle cx="32" cy="35" r="3" fill={c}/>
          <circle cx="40" cy="35" r="3" fill={c}/>
          <circle cx="48" cy="40" r="3" fill={c}/>
          <path d="M60 70C60 80 70 85 75 80C80 75 75 60 70 50C65 40 55 40 55 50C55 60 60 60 60 70Z" fill={c}/>
          <circle cx="75" cy="40" r="3" fill={c}/>
          <circle cx="68" cy="35" r="3" fill={c}/>
          <circle cx="60" cy="35" r="3" fill={c}/>
          <circle cx="52" cy="40" r="3" fill={c}/>
        </svg>
      );
    case 'cycling':
      return (
        <svg width={24} height={24} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <circle cx="75" cy="70" r="15" stroke={c} strokeWidth="5"/>
          <path d="M25 70L45 45H65L75 70" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M45 45L55 30H65"       stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="55" cy="25" r="4" fill={c}/>
        </svg>
      );
    case 'crosstrainer':
      return (
        <svg width={24} height={24} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="75" width="50" height="8" fill={c}/>
          <rect x="35" y="70" width="35" height="5" fill={c}/>
          <rect x="56" y="65" width="14" height="5" fill={c}/>
          <path d="M62 65V45L68 40" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="47" cy="23" r="6" fill={c}/>
          <path d="M47 28L40 45"    stroke={c} strokeWidth="9" strokeLinecap="round"/>
          <path d="M47 30L55 38L60 38" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M47 30L35 35L28 42" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L45 55L52 65" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M40 45L35 60L28 70" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            onClick={() => onSelect(isSelected ? null : (ex ?? null))}
            style={{
              flex: '0 0 44px',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: bg,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              opacity: ex ? 1 : 0.35,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <IconSVG iconKey={key} color={color} />
          </button>
        );
      })}
    </div>
  );
};

export default ExerciseIconBar;
