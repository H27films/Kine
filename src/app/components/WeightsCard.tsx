import React from 'react';
import { Dumbbell } from 'lucide-react';

interface DayWeight {
  name: string;
  weight: number;
}

interface WeightsCardProps {
  dayWeights: DayWeight[];
  dayWeightsTotal: number;
  onToggle: () => void;
}

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export const WeightsCard: React.FC<WeightsCardProps> = ({
  dayWeights,
  dayWeightsTotal,
  onToggle,
}) => {
  return (
    <div
      className={`rounded-lg ${dayWeights.length > 0 ? 'p-5' : 'p-3'} cursor-pointer`}
      style={{
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeft: '2px solid rgba(0,0,0,0.9)',
        boxShadow: '0 5px 12px rgba(0,0,0,0.08)',
      }}
      onClick={onToggle}
    >
      <div className={`flex items-center justify-between ${dayWeights.length > 0 ? 'mb-4' : 'mb-0'}`}>
        <div className="flex items-center gap-2">
          <Dumbbell size={16} color="#1a1a1a" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 650,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'rgba(26,26,26,0.8)',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            Weights
          </span>
        </div>
        {dayWeights.length > 0 && (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1,
                fontFamily: "'Archivo', sans-serif",
              }}
            >
              {dayWeights.length}
            </span>
          </div>
        )}
      </div>

      {dayWeights.length > 0 ? (
        <>
          <div className="text-4xl font-black tracking-tight" style={{ color: '#1a1a1a' }}>
            {Math.round(dayWeightsTotal).toLocaleString()}{' '}
            <span style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(26,26,26,0.7)' }}>
              KG
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {dayWeights.map((ex, i) => (
              <div key={i} className="flex items-center justify-between">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'rgba(26,26,26,0.9)', fontFamily: "'Archivo', sans-serif" }}
                >
                  {toTitleCase(ex.name)}
                </span>
                <span className="text-[12px] font-bold" style={{ color: '#1a1a1a' }}>
                  {Math.round(ex.weight).toLocaleString()} kg
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          className="text-[13px] font-medium py-1"
          style={{ color: 'rgba(26,26,26,0.3)', fontFamily: "'Archivo', sans-serif" }}
        >
          No weights logged
        </div>
      )}
    </div>
  );
};