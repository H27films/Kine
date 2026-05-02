import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface RunningWorkout {
  id: string;
  date: string;
  total_cardio: number;
  time: string | null;
  week: number;
}

interface DataPoint {
  occurrence: number;
  value: number;
  originalValue: number;
  date: string;
  workoutId: string;
}

interface RunningChartProps {
  // No props needed, data loaded internally
}

const parseTimeToHours = (time: string | null): number | null => {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length !== 3) return null;
  const hours = parseFloat(parts[0]) + parseFloat(parts[1]) / 60 + parseFloat(parts[2]) / 3600;
  return hours;
};

const getMonthInfo = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const label = `${monthNames[month - 1]} ${year}`;
  return { daysInMonth, label };
};

const calculateSpeed = (km: number, time: string | null): number | null => {
  const hours = parseTimeToHours(time);
  if (!hours || hours === 0) return null;
  return km / hours;
};

export const RunningChart: React.FC<RunningChartProps> = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [workouts, setWorkouts] = useState<RunningWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const chartViews = [
    { label: 'CURRENT WEEK', type: 'week' },
    { label: 'CURRENT MONTH', type: 'month' },
    { label: 'ALL DATA', type: 'all' },
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
    const { data } = await supabase
      .from('workouts')
      .select('id, date, total_cardio, time, week')
      .eq('exercise_id', 84)
      .not('total_cardio', 'is', null)
      .order('date', { ascending: true });

      if (data) {
        setWorkouts(data as RunningWorkout[]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const getCurrentWeek = () => {
    const now = new Date();
    const startDate = new Date('2025-01-06T00:00:00');
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - startDate.getTime()) / msPerWeek) + 1;
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const prepareWeekData = () => {
    const currentWeek = getCurrentWeek();
    const weekWorkouts = workouts.filter(w => w.week === currentWeek);
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayData = dayLabels.map((label, index) => {
      const dayWorkouts = weekWorkouts.filter(w => {
        const d = new Date(w.date + 'T00:00:00');
        return d.getDay() === (index === 6 ? 0 : index + 1); // Mon=1, Sun=0
      });
      const totalKm = dayWorkouts.reduce((sum, w) => sum + (w.total_cardio || 0), 0);
      const speeds = dayWorkouts.map(w => calculateSpeed(w.total_cardio || 0, w.time)).filter(s => s !== null) as number[];
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
      return { label, km: totalKm, displayKm: totalKm, originalKm: totalKm, avgSpeed, sessions: dayWorkouts.length };
    });
    return dayData;
  };

  const prepareMonthData = () => {
    const currentMonth = getCurrentMonth();
    const monthWorkouts = workouts.filter(w => w.date.startsWith(currentMonth));
    const daysInMonth = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).getDate();
    const dayData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
      const dayWorkouts = monthWorkouts.filter(w => w.date === dayStr);
      const totalKm = dayWorkouts.reduce((sum, w) => sum + (w.total_cardio || 0), 0);
      const speeds = dayWorkouts.map(w => calculateSpeed(w.total_cardio || 0, w.time)).filter(s => s !== null) as number[];
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
      return { label: String(day), km: totalKm, displayKm: totalKm, originalKm: totalKm, avgSpeed, sessions: dayWorkouts.length };
    });

    // Apply decaying height for zero values
    let lastNonZeroKm = 0;
    let lastNonZeroIndex = -1;
    for (let i = 0; i < dayData.length; i++) {
      if (dayData[i].km > 0) {
        lastNonZeroKm = dayData[i].km;
        lastNonZeroIndex = i;
      } else if (lastNonZeroIndex >= 0) {
        const distance = i - lastNonZeroIndex;
        dayData[i].displayKm = lastNonZeroKm * Math.pow(0.75, distance);
      } else {
        dayData[i].displayKm = 0;
      }
    }

    return dayData;
  };

  const prepareAllData = () => {
    // Group by week for all data
    const weekGroups: Record<number, { km: number; speeds: number[]; sessions: number }> = {};
    workouts.forEach(w => {
      const week = w.week;
      if (!weekGroups[week]) weekGroups[week] = { km: 0, speeds: [], sessions: 0 };
      weekGroups[week].km += w.total_cardio || 0;
      const speed = calculateSpeed(w.total_cardio || 0, w.time);
      if (speed !== null) weekGroups[week].speeds.push(speed);
      weekGroups[week].sessions++;
    });
    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);
    return sortedWeeks.map(week => {
      const data = weekGroups[week];
      const avgSpeed = data.speeds.length > 0 ? data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length : null;
      return { label: `W${week}`, km: data.km, displayKm: data.km, originalKm: data.km, avgSpeed, sessions: data.sessions };
    });
  };

  const getDataForView = (type: string) => {
    switch (type) {
      case 'week': return prepareWeekData();
      case 'month': return prepareMonthData();
      case 'all': return prepareAllData();
      default: return [];
    }
  };

  const getStats = () => {
    const allSpeeds = workouts.map(w => calculateSpeed(w.total_cardio || 0, w.time)).filter(s => s !== null) as number[];
    const allKm = workouts.map(w => w.total_cardio || 0);
    const maxKm = allKm.length > 0 ? Math.max(...allKm) : 0;
    const avgKm = allKm.length > 0 ? allKm.reduce((a, b) => a + b, 0) / allKm.length : 0;
    const maxSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;
    const avgSpeed = allSpeeds.length > 0 ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length : 0;
    const totalKm = allKm.reduce((a, b) => a + b, 0);
    return { maxKm, avgKm, maxSpeed, avgSpeed, totalKm, totalSessions: workouts.length };
  };

  const stats = getStats();

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && currentIndex < chartViews.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const renderChartArea = (view: { label: string; type: string }, data: any[]) => {
    const points: DataPoint[] = data.map((d, i) => ({
      occurrence: view.type === 'week' ? i + 1 : view.type === 'month' ? parseInt(d.label) : parseInt(d.label.replace('W', '')),
      value: d.displayKm,
      originalValue: d.originalKm,
      date: d.label,
      workoutId: `${view.type}-${i}`
    }));
    const total = view.type === 'month' ? data.reduce((sum, d) => d.originalKm > 0 ? sum + d.originalKm : sum, 0) : points.reduce((sum, p) => sum + p.value, 0);
    const sessionCount = data.reduce((sum, d) => sum + d.sessions, 0);
    const avgDenominator = points.length;
    const metricLabel = 'KM';

    // Simple bar chart
    const chartHeight = 220;
    const chartWidth = 340;
    const paddingX = 8;
    const paddingY = 20;
    const plotWidth = chartWidth - paddingX * 2;
    const plotHeight = chartHeight - paddingY * 2;

    const minValue = points.length > 0 ? Math.min(...points.map(d => d.value)) : 0;
    const maxValue = points.length > 0 ? Math.max(...points.map(d => d.value)) : 100;
    const originalMax = data.length > 0 ? Math.max(...data.map(d => d.km)) : 0;
    const yMin = Math.min(0, minValue - (maxValue - minValue) * 0.1);
    const yMax = maxValue + (maxValue - minValue) * 0.1 || 10;

    const barWidth = points.length > 0 ? Math.max(8, plotWidth / points.length - 4) : 0;
    const barSpacing = 4;

    return (
      <div>
          {/* Period header */}
        <div style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: '24px',
          fontWeight: 348,
          fontStretch: '175%',
          letterSpacing: '0.08em',
          color: 'rgba(0,0,0,0.7)',
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          {view.type === 'week' ? `WEEK ${getCurrentWeek()}` : view.type === 'month' ? `${getMonthInfo(getCurrentMonth()).label}` : 'ALL TIME'}
        </div>

        {/* Big number */}
        <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#1a1a1a' }}>
              {total.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase' }}>
              {metricLabel}
            </div>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '6px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {sessionCount}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: '220px', position: 'relative', marginBottom: '2px' }}>
          {points.length > 0 ? (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
                  {points.map((d, i) => {
                const x = paddingX + i * (barWidth + barSpacing);
                const barHeight = d.value === 0 ? 1.5 : Math.max(4, ((d.value - yMin) / Math.max(yMax - yMin, 1)) * plotHeight);
                const y = paddingY + plotHeight - barHeight;
                const pct = (d.value - minValue) / (maxValue - minValue);
                const opacity = 0.15 + (Math.max(pct, 0) * 0.85);
                const label = d.value === 0 ? '0.0' : d.value.toFixed(1);
                return (
                  <g key={d.workoutId}>
                    {view.type === 'month' ? (
                      <>
                        <line
                          x1={x + barWidth / 2}
                          y1={paddingY + plotHeight}
                          x2={x + barWidth / 2}
                          y2={y}
                          stroke={d.originalValue === 0 ? "#ccc" : "#1a1a1a"}
                          strokeWidth="1"
                        />
                        {d.originalValue > 0 && (
                          <circle
                            cx={x + barWidth / 2}
                            cy={y}
                            r={Math.max(2, Math.min(8, 2 + (d.originalValue / originalMax) * 6))}
                            fill="#1a1a1a"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <path
                          d={`M ${x},${y + barHeight} L ${x},${y} L ${x + barWidth},${y} L ${x + barWidth},${y + barHeight} Z`}
                          fill="#1a1a1a"
                          fillOpacity={opacity}
                        />
                        {d.value > 0 && view.type === 'week' && (
                          <text
                            x={x + barWidth / 2}
                            y={y + barHeight / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#f2f2f2"
                            fontSize="10px"
                            fontWeight="600"
                            fontFamily="'JetBrains Mono', monospace"
                          >
                            {d.value.toFixed(1)}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '12px' }}>
              No data
            </div>
          )}
        </div>

        {/* X-axis labels */}
        {view.type !== 'month' && (
          <div style={{ position: 'relative', height: '10px' }}>
            {points.map((point, i) => {
              const showLabel = view.type === 'all' ? i % 2 === 0 : true;
              const barLeft = paddingX + i * (barWidth + barSpacing);
              const barCenter = barLeft + barWidth / 2;
              const leftPercent = (barCenter / chartWidth) * 100;
              return showLabel ? (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                    fontSize: '9px',
                    fontWeight: 500,
                    color: '#1a1a1a',
                    letterSpacing: '0.02em',
                  }}
                >
                  {point.date}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '16px',
          marginBottom: '16px'
        }}>
          {chartViews.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: currentIndex === index ? '#1a1a1a' : '#ccc',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </div>

        {/* MAX/AVG stats */}
        {points.length > 0 && (
          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '22px',
                fontWeight: 348,
                fontStretch: '175%',
                letterSpacing: '0.06em',
                color: 'rgba(0,0,0,0.35)',
                textTransform: 'uppercase',
              }}>
                MAX
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
                {Math.max(...data.map(d => d.originalKm)).toLocaleString()}<span style={{ fontSize: '16px', fontWeight: 200, color: '#999', marginLeft: '1px' }}>KM</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
                {view.type === 'week' ? 'Day' : view.type === 'month' ? 'Day' : 'Week'} {points.reduce((max, d) => d.value > max.value ? d : max).occurrence}
              </div>
              {(() => {
                const speeds = data.map(d => d.avgSpeed).filter(s => s !== null) as number[];
                const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
                return maxSpeed > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      fontFamily: "'Inconsolata', monospace",
                      fontSize: '22px',
                      fontWeight: 348,
                      fontStretch: '175%',
                      letterSpacing: '0.06em',
                      color: 'rgba(0,0,0,0.35)',
                      textTransform: 'uppercase',
                    }}>
                      SPEED
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
                      {maxSpeed.toFixed(1)}<span style={{ fontSize: '16px', fontWeight: 200, color: '#999', marginLeft: '2px' }}>KM/H</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Inconsolata', monospace",
                fontSize: '22px',
                fontWeight: 348,
                fontStretch: '175%',
                letterSpacing: '0.06em',
                color: 'rgba(0,0,0,0.35)',
                textTransform: 'uppercase',
                textAlign: 'right',
              }}>
                AVG
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
                {sessionCount > 0 ? Math.round(total / sessionCount) : 0}<span style={{ fontSize: '16px', fontWeight: 200, color: '#999', marginLeft: '2px' }}>KM</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#1a1a1a', marginTop: '2px', textTransform: 'uppercase' }}>
                All {view.type === 'week' ? 'days' : view.type === 'month' ? 'days' : 'weeks'}
              </div>
              {(() => {
                const speeds = data.map(d => d.avgSpeed).filter(s => s !== null) as number[];
                const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
                return avgSpeed > 0 ? (
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <div style={{
                      fontFamily: "'Inconsolata', monospace",
                      fontSize: '22px',
                      fontWeight: 348,
                      fontStretch: '175%',
                      letterSpacing: '0.06em',
                      color: 'rgba(0,0,0,0.35)',
                      textTransform: 'uppercase',
                      textAlign: 'right',
                    }}>
                      SPEED
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.1 }}>
                      {avgSpeed.toFixed(1)}<span style={{ fontSize: '16px', fontWeight: 200, color: '#999', marginLeft: '2px' }}>KM/H</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Swipeable container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          width: `${chartViews.length * 100}%`,
          transform: `translateX(-${currentIndex * (100 / chartViews.length)}%)`,
          transition: 'transform 0.3s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {chartViews.map((view, index) => {
          const data = getDataForView(view.type);
          return (
            <div key={index} style={{ width: `${100 / chartViews.length}%`, padding: '0 20px' }}>
              {renderChartArea(view, data)}
            </div>
          );
        })}
      </div>




    </div>
  );
};