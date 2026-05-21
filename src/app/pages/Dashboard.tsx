import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Page } from '../../types';

import { DailyActivityCards } from '../components/DailyActivityCards';
import { WeeklySummaryBar } from '../components/WeeklySummaryBar';
import WeeklyVolumeCompact from '../components/WeeklyVolumeCompact';
import CardioChartSection, { CARDIO_DISPLAY } from '../components/CardioChartSection';
import MonthlyCalendarChart from '../components/MonthlyCalendarChart';
import { malaysiaDateStr } from '../../lib/supabase';
import { WeeklyChart } from '../components/WeeklyChart';
import { WeightsCard } from '../components/WeightsCard';
import { QuickLog } from '../components/QuickLog';
import { useDashboardData } from '../hooks/useDashboardData';

const CARDIO_ALWAYS = ['TRACKER', 'RUNNING', 'ROW', 'CROSS TRAINER', 'WALKING', 'CYCLE'];
const CARDIO_CONDITIONAL: string[] = [];

export const Dashboard: React.FC<{ showWeeklySummary?: boolean; showQuickLog?: boolean; onCloseQuickLog?: () => void; onNavigate?: (page: Page, data?: any) => void }> = ({
  showWeeklySummary = false,
  showQuickLog = false,
  onCloseQuickLog,
  onNavigate,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => malaysiaDateStr(new Date()));
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [weightsExpanded, setWeightsExpanded] = useState(false);
  const [monthlyOffset, setMonthlyOffset] = useState(0);
  const [showFoodRatingLabel, setShowFoodRatingLabel] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('kine:data-updated', handler);
    return () => window.removeEventListener('kine:data-updated', handler);
  }, []);

  const {
    todayActivities,
    totalMovement,
    yesterdayMovement,
    dayWeights,
    dayWeightsTotal,
    todayCalories,
    foodRating,
    cardioWeeks,
    weightsWeeks,
    weightsExerciseCounts,
    calorieWeeks,
    scoreWeeks,
    activityWeeklyData,
    monthlyMinOffset,
    monthlyMaxOffset,
  } = useDashboardData(selectedDate, refreshKey);

  const visibleCardioKeys = [
    ...CARDIO_ALWAYS,
    ...CARDIO_CONDITIONAL.filter(key =>
      todayActivities.some(a => a.exercise_name === key && a.km > 0)
    ),
  ].sort((a, b) => {
    if (a === 'TRACKER') return -1;
    if (b === 'TRACKER') return 1;
    const aHasData = todayActivities.some(act => act.exercise_name === a && act.km > 0);
    const bHasData = todayActivities.some(act => act.exercise_name === b && act.km > 0);
    return (bHasData ? 1 : 0) - (aHasData ? 1 : 0);
  });

  const allWeekNumbers = Array.from(
    new Set([
      ...cardioWeeks.map(w => w.weekNumber),
      ...weightsWeeks.map(w => w.weekNumber),
      ...calorieWeeks.map(w => w.weekNumber),
      ...scoreWeeks.map(w => w.weekNumber),
    ])
  ).sort((a, b) => b - a);

  const weeklyActivityTotal =
    selectedActivity && activityWeeklyData[selectedActivity]
      ? +activityWeeklyData[selectedActivity].reduce((s, v) => s + v, 0).toFixed(1)
      : null;
  const displayMovement = weeklyActivityTotal !== null ? weeklyActivityTotal : totalMovement;

  const getCalendarDates = () => {
    const today = new Date();
    const todayMalaysia = malaysiaDateStr(today);
    const todayDate = new Date(todayMalaysia + 'T00:00:00Z');
    const todayDay = todayDate.getDay();
    const mondayDate = new Date(todayDate);
    mondayDate.setDate(todayDate.getDate() - (todayDay === 0 ? 6 : todayDay - 1));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
      const dateStr = malaysiaDateStr(date);
      return {
        dateStr,
        dayOfWeek: date.getDate(),
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayMalaysia,
      };
    });
  };

  const calendarDates = getCalendarDates();

  return (
    <div className="-mt-2">
      {showWeeklySummary && (
        <div className="mb-3" style={{ marginBottom: '10px' }}>
          <WeeklySummaryBar />
        </div>
      )}

<div style={{
        overflow: 'hidden',
        maxHeight: showQuickLog && !showWeeklySummary ? '200px' : '0px',
        opacity: showQuickLog && !showWeeklySummary ? 1 : 0,
        marginBottom: showQuickLog && !showWeeklySummary ? '12px' : '0px',
        transition: 'max-height 0.25s ease, opacity 0.25s ease, margin-bottom 0.25s ease',
      }}>
        <QuickLog onClose={onCloseQuickLog} onSuccess={onCloseQuickLog} />
      </div>

      {!showWeeklySummary && (
        <div className="flex justify-between items-center py-1 mb-1">
          {calendarDates.map((day, i) => (
            <div
              key={i}
              onClick={() => setSelectedDate(day.dateStr)}
              className="flex flex-col items-center cursor-pointer"
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  marginBottom: '8px',
                  color: showWeeklySummary ? 'rgba(26,26,26,0.5)' : 'rgba(26,26,26,0.8)',
                }}
              >
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  day.isSelected
                    ? 'bg-[#1a1a1a] text-white'
                    : day.isToday
                    ? 'border-2 border-black/20 text-[#1a1a1a]'
                    : 'text-[rgba(26,26,26,0.85)]'
                }`}
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {day.dayOfWeek}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="pt-1 mb-4">
        <div className="flex items-start">
          <div
            className="text-[4rem] font-black leading-none tracking-tighter flex-shrink-0"
            style={{ color: '#1a1a1a' }}
          >
            {displayMovement > 0 ? displayMovement.toFixed(1) : '0.0'}
          </div>
          <div className="flex flex-col justify-center ml-4 pt-3 flex-1 min-w-0">
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '2.5px',
                color: '#1a1a1a',
                fontFamily: "'Archivo', sans-serif",
              }}
            >
              {selectedActivity ? `${CARDIO_DISPLAY[selectedActivity]?.label || selectedActivity} (KM)` : 'MOVEMENT (KM)'}
            </div>
            {selectedActivity && (
              <div className="text-[11px] font-medium" style={{ color: 'rgba(26,26,26,0.45)', fontFamily: "'Archivo', sans-serif" }}>
                This week
              </div>
            )}
            {!selectedActivity && yesterdayMovement > 0 && (
              <div className="text-[11px] font-medium" style={{ color: 'rgba(26,26,26,0.45)', fontFamily: "'Archivo', sans-serif" }}>
                Yesterday {yesterdayMovement.toFixed(1)} km
              </div>
            )}
          </div>

          {!selectedActivity && (
            <div
              className="flex items-center justify-center ml-4"
              style={{ marginTop: '10px', gap: showFoodRatingLabel ? '10px' : '5px', cursor: 'pointer' }}
              onClick={() => setShowFoodRatingLabel(v => !v)}
            >
              {showFoodRatingLabel && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.2em',
                    color: 'rgba(26,26,26,0.9)',
                    textTransform: 'uppercase',
                    fontFamily: "'Archivo', sans-serif",
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    lineHeight: 1.25,
                  }}
                >
                  FOOD<br />RATING
                </span>
              )}
              <div className="flex flex-col items-center justify-center" style={{ gap: '5px' }}>
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: 'rgba(26,26,26,0.25)' }} />
                {(foodRating === 'OK' || foodRating === 'GOOD') && (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: 'rgba(26,26,26,0.55)' }} />
                )}
                {foodRating === 'GOOD' && (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#1a1a1a' }} />
                )}
              </div>
            </div>
          )}

          {selectedActivity && (
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate('cardio', { selectedActivity });
                } else {
                  const btn = document.querySelector('[data-page="cardio"]') as HTMLButtonElement;
                  btn?.click();
                }
              }}
              style={{ cursor: 'pointer', marginLeft: '16px', marginTop: '12px' }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} color="#ffffff" />
              </div>
            </div>
          )}
        </div>

        <CardioChartSection
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          activityWeeklyData={activityWeeklyData}
          visibleCardioKeys={visibleCardioKeys}
          todayActivities={todayActivities}
          todayCalories={todayCalories}
        />
      </section>

      <section className="mb-6">
      <WeightsCard
  dayWeights={dayWeights}
  dayWeightsTotal={dayWeightsTotal}
  onToggle={() => setWeightsExpanded(e => !e)}
/>
      </section>

      {weightsExpanded && (
        <section className="mb-4 mt-1.5">
          <WeeklyVolumeCompact selectedWeekNumber={selectedWeekNumber} allWeekNumbers={allWeekNumbers} />
        </section>
      )}

      <section className="mt-8">
        <WeeklyChart
          cardioWeeks={cardioWeeks}
          weightsWeeks={weightsWeeks}
          calorieWeeks={calorieWeeks}
          scoreWeeks={scoreWeeks}
          weightsExerciseCounts={weightsExerciseCounts}
          selectedWeekNumber={selectedWeekNumber}
          onWeekChange={setSelectedWeekNumber}
        />
      </section>

      <section className="mt-8">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#1a1a1a',
                fontFamily: "'Archivo', sans-serif",
              }}
            >
              Monthly
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={() => setMonthlyOffset(o => Math.max(o - 1, monthlyMinOffset))}
                disabled={monthlyOffset <= monthlyMinOffset}
                style={{
                  opacity: monthlyOffset <= monthlyMinOffset ? 0.2 : 0.9,
                  background: 'none', border: 'none',
                  cursor: monthlyOffset <= monthlyMinOffset ? 'default' : 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center',
                }}
              >
                <ChevronLeft size={18} color="#1a1a1a" />
              </button>
              <button
                onClick={() => setMonthlyOffset(o => Math.min(o + 1, monthlyMaxOffset))}
                disabled={monthlyOffset >= monthlyMaxOffset}
                style={{
                  opacity: monthlyOffset >= monthlyMaxOffset ? 0.2 : 0.9,
                  background: 'none', border: 'none',
                  cursor: monthlyOffset >= monthlyMaxOffset ? 'default' : 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center',
                }}
              >
                <ChevronRight size={18} color="#1a1a1a" />
              </button>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#1a1a1a',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {(() => {
              const d = new Date();
              d.setMonth(d.getMonth() + monthlyOffset);
              return d.toLocaleString('default', { month: 'long' }).toUpperCase();
            })()}
          </span>
        </div>
        <MonthlyCalendarChart
          monthOffset={monthlyOffset}
          containerStyle={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderLeft: '2px solid rgba(0,0,0,0.9)',
            boxShadow: '0 5px 12px rgba(0,0,0,0.08)',
            padding: '32px 24px',
          }}
        />
      </section>

      <section className="mt-8">
        <DailyActivityCards />
      </section>
    </div>
  );
};