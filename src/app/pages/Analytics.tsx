import React, { useState, useEffect } from 'react';
import { Home, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../../types';
import { MaxStatsCard } from '../components/MaxStatsCard';

const TIME_PERIODS = ['WEEKLY', 'MONTHLY', 'PERIOD'];

interface DataPoint {
  label: string;
  value: number;
}

interface AnalyticsProps {
  onNavigate: (page: Page) => void;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Analytics: React.FC<AnalyticsProps> = ({ onNavigate }) => {
  const [category, setCategory] = useState('CHEST');
  const [timePeriod, setTimePeriod] = useState('WEEKLY');
  const [data, setData] = useState<DataPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [foodScore, setFoodScore] = useState(0);
  const [foodMaxScore, setFoodMaxScore] = useState(21); // 7 days × 3 for weekly default
  const [foodDaysWithRating, setFoodDaysWithRating] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [totalRaw, setTotalRaw] = useState(0);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(66);
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [minWeek, setMinWeek] = useState<number | null>(null);
  const [maxWeek, setMaxWeek] = useState<number | null>(null);
  const [minMonth, setMinMonth] = useState<string | null>(null);
  const [maxMonth, setMaxMonth] = useState<string | null>(null);

  const isTracker = category === 'TRACKER';
  const isAllWeights = category === 'ALL WEIGHTS';
  const isCardio = ['RUNNING', 'ROWING', 'CROSS TRAINER'].includes(category);
  const isCalories = category === 'CALORIES';
  const isFood = category === 'FOOD';
  const isScore = category === 'SCORE';

  const selectedWeek = currentWeek + weekOffset;

  // Compute the actual selected month string (YYYY-MM)
  const getSelectedMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const selectedMonth = getSelectedMonth();

  // Get days in the selected month and month label
  const getMonthInfo = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const label = `${monthNames[month - 1]} ${year}`;
    return { daysInMonth, label };
  };

  // Fetch available weeks, months, and current week from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week, date')
        .not('week', 'is', null)
        .order('week');

      if (data && data.length > 0) {
        const weeks = [...new Set((data as any[]).map(r => r.week as number))].sort((a, b) => a - b);
        setMinWeek(weeks[0]);
        setMaxWeek(weeks[weeks.length - 1]);
        setCurrentWeek(weeks[weeks.length - 1]);

        // Compute min/max months from dates
        const dates = (data as any[]).map(r => r.date).filter(Boolean).sort();
        if (dates.length > 0) {
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          const toMonth = (d: string) => d.substring(0, 7); // YYYY-MM
          setMinMonth(toMonth(minDate));
          setMaxMonth(toMonth(maxDate));
        }
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handler = () => { setCategoryOpen(false); setPeriodOpen(false); setSelectedGroup(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadChartData = async () => {
    let labels: string[] = [];
    let weekNumbers: number[] = [];
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    if (timePeriod === 'WEEKLY') {
      labels = dayLabels.map(d => d);
      weekNumbers = [selectedWeek];
    } else if (timePeriod === 'MONTHLY') {
      // Daily bars for the selected month
      const { daysInMonth } = getMonthInfo(selectedMonth);
      const [year, month] = selectedMonth.split('-').map(Number);
      dateStart = `${year}-${String(month).padStart(2, '0')}-01`;
      dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      // Labels: day numbers (1-31)
      labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    } else {
      // PERIOD = 8 weeks
      const startWeek = selectedWeek - 7;
      weekNumbers = Array.from({ length: 8 }, (_, i) => startWeek + i);
      labels = weekNumbers.map(w => `W${w}`);
    }

    let query;
    if (timePeriod === 'MONTHLY') {
      // Query by date range
      if (isCalories || isFood || isScore) {
        query = supabase
          .from('workouts')
          .select('*')
          .gte('date', dateStart!)
          .lte('date', dateEnd!);
      } else if (isCardio) {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .gte('date', dateStart!)
          .lte('date', dateEnd!);
      } else if (isTracker) {
        query = supabase
          .from('workouts')
          .select('*')
          .in('exercise_id', [82, 83, 87])
          .gte('date', dateStart!)
          .lte('date', dateEnd!);
      } else if (isAllWeights) {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .gte('date', dateStart!)
          .lte('date', dateEnd!);
      } else {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .eq('type', category)
          .gte('date', dateStart!)
          .lte('date', dateEnd!);
      }
    } else {
      // Query by week numbers
      if (isCalories || isFood || isScore) {
        query = supabase
          .from('workouts')
          .select('*')
          .in('week', weekNumbers);
      } else if (isCardio) {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .in('week', weekNumbers);
      } else if (isTracker) {
        query = supabase
          .from('workouts')
          .select('*')
          .in('exercise_id', [82, 83, 87])
          .in('week', weekNumbers);
      } else if (isAllWeights) {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .in('type', ['CHEST', 'BACK', 'LEGS'])
          .in('week', weekNumbers);
      } else {
        query = supabase
          .from('workouts')
          .select('*, exercises(exercise_name)')
          .eq('type', category)
          .in('week', weekNumbers);
      }
    }

    const { data: rows } = await query;

    const values = new Array(labels.length).fill(0);
    const count = new Array(labels.length).fill(0);
    let foodScoreTotal = 0;
    let foodDaysWithRatingCount = 0;
    let rawTotal = 0;
    let sessionRows = 0;

    if (rows) {
      // SCORE needs deduplication per week_day (same as Dashboard)
      const seenScoreKeys = isScore ? new Set<string>() : null;
      for (const row of rows as any[]) {
        if (isScore) {
          const key = `${row.week}_${row.day}`;
          if (seenScoreKeys!.has(key)) continue;
          seenScoreKeys!.add(key);
        }

        let matchCategory = false;
        if (isCalories) matchCategory = (row.calories || 0) > 0;
        else if (isFood) matchCategory = !!row.food_rating;
        else if (isScore) matchCategory = row.total_score != null && Number(row.total_score || 0) > 0;
        else if (isCardio) {
          const name = (row.exercises?.exercise_name || '').toUpperCase();
          // ROWING dropdown maps to ROW exercise in Supabase
          matchCategory = name === (category === 'ROWING' ? 'ROW' : category === 'CROSS TRAINER' ? 'CROSS TRAINER' : category);
        } else if (isTracker) {
          matchCategory = true; // Query already filtered by exercise_ids [82, 83, 87]
        } else {
          matchCategory = true;
        }

        if (!matchCategory) continue;

        sessionRows++;

        let idx: number;

        if (timePeriod === 'MONTHLY') {
          // Map row date to day of month index
          const dayOfMonth = parseInt(row.date.split('-')[2], 10);
          idx = dayOfMonth - 1;
        } else if (timePeriod === 'WEEKLY') {
          // Map day name to index
          const dayMap: Record<string, number> = {
            'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6,
          };
          idx = dayMap[(row.day || '').toUpperCase()] ?? 0;
        } else {
          idx = weekNumbers.indexOf(row.week);
        }

        if (idx >= 0 && idx < labels.length) {
          let val = 0;
          if (isCalories) { val = row.calories || 0; rawTotal += val; }
          else if (isFood) {
            const rating = (row.food_rating || '').toUpperCase();
            val = rating === 'GOOD' ? 3 : rating === 'OK' ? 2 : rating === 'BAD' ? 1 : 0;
            foodScoreTotal += val;
            if (val > 0) foodDaysWithRatingCount++;
          }
          else if (isScore) { val = row.total_score || 0; rawTotal += val; }
          else if (isTracker) { val = row.total_cardio || 0; rawTotal += val; }
          else { val = row.total_weight || row.km || row.total_cardio || 0; rawTotal += val; }
          values[idx] += val;
          count[idx]++;
        }
      }
    }

    const points = labels.map((label, i) => {
      let val = Math.round(values[i]);
      if (isCalories && timePeriod === 'PERIOD') val = Math.round(val / 7);
      if (isScore && timePeriod === 'PERIOD') val = Math.round(val / 7);
      return { label, value: val };
    });
    setData(points);
    setTotal(Math.round(values.reduce((a, b) => a + b, 0)));

    // For PERIOD: average weekly score; for WEEKLY: raw score
    const numWeeks = timePeriod === 'PERIOD' ? 8 : timePeriod === 'MONTHLY' ? 4 : 1;
    const avgWeeklyFood = timePeriod === 'MONTHLY' ? foodScoreTotal : Math.round(foodScoreTotal / numWeeks);
    setFoodScore(avgWeeklyFood);
    setFoodMaxScore(21); // Always 7 days × 3
    setFoodDaysWithRating(foodDaysWithRatingCount);

    setTotalRaw(rawTotal);
    setSessionCount(sessionRows);

    // Compute average: total / number of non-zero bars
    const nonZeroCount = count.filter(c => c > 0).length;
    setAvgValue(nonZeroCount > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / nonZeroCount) : 0);
  };

  useEffect(() => {
    setWeekOffset(0);
    setMonthOffset(0);
    setSelectedBarIdx(null);
    setSessionCount(0);
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, timePeriod, currentWeek, currentMonth]);

  useEffect(() => { loadChartData(); }, [weekOffset, monthOffset, timePeriod]);

  const minValue = 40000;
  const maxValue = Math.max(...data.map(d => d.value), minValue + 1);
  const metricLabel = isCalories ? 'KCAL' : isFood ? 'SCORE' : isScore ? 'SC' : (isCardio || isTracker ? 'KM' : 'KG');

  // Food display for MONTHLY: average rating per day (only days with ratings)
  const foodAvgPerDay = timePeriod === 'MONTHLY' && foodDaysWithRating > 0 ? (foodScore / foodDaysWithRating).toFixed(1) : '0.0';

  // Format display: Calories WEEKLY/MONTHLY shows avg, Calories PERIOD shows daily avg / 7
  const caloriesPeriodDaily = isCalories && timePeriod === 'PERIOD' ? Math.round(totalRaw / 49) : null;
  const scorePeriodDaily = isScore && timePeriod === 'PERIOD' ? Math.round(totalRaw / 49) : null;

  // Weights PERIOD: show avg per week (total / 8)
  const isWeights = !isCalories && !isCardio && !isTracker && !isFood && !isScore;
  const weightsPeriodAvg = isWeights && timePeriod === 'PERIOD' ? Math.round(totalRaw / 8) : null;

  const displayTotal = isCalories && timePeriod === 'PERIOD'
    ? caloriesPeriodDaily!.toLocaleString()
    : isScore && timePeriod === 'PERIOD'
    ? scorePeriodDaily!.toLocaleString()
    : isWeights && timePeriod === 'PERIOD'
    ? weightsPeriodAvg!.toLocaleString()
    : isCalories || isScore
    ? avgValue.toLocaleString()
    : isCardio || isTracker
    ? totalRaw === 0 ? '0.0' : totalRaw.toFixed(1)
    : total.toLocaleString();

  // Days with data for avg calculation
  const daysWithData = data.filter(d => d.value > 0).length;
  const trackerMonthlyAvg = isTracker && timePeriod === 'MONTHLY' && daysWithData > 0
    ? (totalRaw / daysWithData).toFixed(1)
    : '';
  const cardioPeriodAvg = (isCardio || isTracker) && timePeriod === 'PERIOD' && daysWithData > 0
    ? (totalRaw / daysWithData).toFixed(1)
    : '';

  const showTotalWithAvg = (isTracker && timePeriod === 'MONTHLY') || ((isCardio || isTracker) && timePeriod === 'PERIOD');
  const avgDisplay = isTracker && timePeriod === 'MONTHLY' ? trackerMonthlyAvg : cardioPeriodAvg;

  // Navigation boundary checks
  const isMonthMode = timePeriod === 'MONTHLY';
  const canGoPrev = isMonthMode
    ? minMonth === null || selectedMonth > minMonth
    : minWeek === null || selectedWeek > minWeek;
  const canGoNext = isMonthMode
    ? maxMonth === null || selectedMonth < maxMonth
    : maxWeek === null || selectedWeek < maxWeek;

  const pillStyle = (): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  });

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '12px',
    padding: '12px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
        color: '#1a1a1a',
        fontFamily: "'JetBrains Mono', monospace",
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => onNavigate('dashboard')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
        >
          <Home size={22} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: '#1a1a1a', textTransform: 'uppercase' }}>
          DATA+
        </span>
        <div style={{ width: 22 }} />
      </div>

      {/* Chart area */}
      <div className="px-5" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '16px' }}>
        {/* Period header */}
        <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '32px', fontWeight: 348, fontStretch: '175%', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>
          {timePeriod === 'WEEKLY' ? `WEEK ${selectedWeek}` : timePeriod === 'MONTHLY' ? getMonthInfo(selectedMonth).label : 'PERIOD'}
        </div>

        {/* Big number */}
        <div className="flex items-start justify-between" style={{ marginBottom: '40px' }}>
          <div>
            {showTotalWithAvg ? (
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#1a1a1a', display: 'flex', alignItems: 'baseline' }}>
                <span>{displayTotal}</span>
                <span style={{ fontSize: '24px', fontWeight: 500, color: '#999', marginLeft: '6px' }}>/{avgDisplay}</span>
              </div>
            ) : (
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#1a1a1a' }}>
                {isScore ? displayTotal : isFood ? (timePeriod !== 'MONTHLY' ? foodScore : foodAvgPerDay) : displayTotal}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase' }}>
              {metricLabel}
            </div>
            {(isCardio || isWeights) && timePeriod === 'WEEKLY' && sessionCount > 0 && (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '6px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {sessionCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '4px' }}>
          {data.map((d, i) => {
            const pct = (d.value - minValue) / (maxValue - minValue);
            const height = pct * 100;
            const showBg = true;
            const hideZeroBar = timePeriod === 'MONTHLY' && d.value === 0;
            const isSelected = (timePeriod === 'WEEKLY' || timePeriod === 'PERIOD') && selectedBarIdx === i;
            const showTooltip = timePeriod === 'WEEKLY' || timePeriod === 'PERIOD';
            return (
              <div key={i} className="flex-1" style={{ height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', cursor: showTooltip ? 'pointer' : 'default' }}>
                {showBg && (
                  <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', top: 0, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '2px 2px 0 0' }} />
                )}
                {isSelected && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 900, color: '#1a1a1a', backgroundColor: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '4px' }}>
                      {(isScore || isFood) ? d.value.toLocaleString() : `${d.value.toLocaleString()} ${metricLabel}`}
                    </span>
                  </div>
                )}
                {!hideZeroBar && (
                  <div
                    onClick={() => showTooltip && setSelectedBarIdx(isSelected ? null : i)}
                    style={{ position: 'relative', zIndex: 1, width: '100%', height: `${Math.max(height, 1)}%`, backgroundColor: isSelected ? '#1a1a1a' : '#1a1a1a', borderRadius: '2px 2px 0 0', opacity: isSelected ? 1 : (0.15 + (Math.max(pct, 0) * 0.85)), transition: 'height 0.4s ease' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between items-center" style={{ paddingTop: '8px' }}>
          {data.map((d, i) => {
            const dayNum = parseInt(d.label, 10);
            const weekStarts = [1, 8, 15, 22, 29];
            const showLabel = timePeriod === 'MONTHLY'
              ? weekStarts.includes(dayNum)
              : true;
            return (
              <span key={i} className="flex-1 text-center" style={{ fontSize: '9px', fontWeight: 500, color: showLabel ? '#1a1a1a' : 'transparent', letterSpacing: '0.02em' }}>{showLabel ? d.label : ''}</span>
            );
          })}
        </div>

        {/* Max/Avg stats card */}
        {timePeriod !== 'PERIOD' && (
          <div style={{ marginTop: '28px' }}>
            <MaxStatsCard category={category} timePeriod={timePeriod} />
          </div>
        )}
      </div>

      {/* Selectors + metric cards */}
      <div className="px-5" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingTop: '8px' }}>
        {/* Two selectors side by side */}
        <div className="flex gap-2 mb-2">
          {/* Category selector */}
          <div className="flex-1 relative" style={{ position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const open = !categoryOpen;
                setCategoryOpen(open);
                setPeriodOpen(false);
                if (open) {
                  if (['ALL WEIGHTS', 'CHEST', 'BACK', 'LEGS'].includes(category)) setSelectedGroup('WEIGHTS');
                  else if (['TRACKER', 'RUNNING', 'ROWING', 'CROSS TRAINER'].includes(category)) setSelectedGroup('CARDIO');
                  else if (['CALORIES', 'FOOD', 'SCORE'].includes(category)) setSelectedGroup('MEASUREMENTS');
                  else setSelectedGroup(null);
                } else {
                  setSelectedGroup(null);
                }
              }}
              style={pillStyle()}
            >
              {category}
              <ChevronDown size={12} />
            </button>
            {categoryOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '10px', marginBottom: '4px', overflow: 'hidden', zIndex: 50,
                boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
              }}>
                {!selectedGroup ? (
                  // Level 1: Groups
                  <>
                    <button
                      onClick={() => setSelectedGroup('WEIGHTS')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      Weights
                    </button>
                    <button
                      onClick={() => setSelectedGroup('CARDIO')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      Cardio
                    </button>
                    <button
                      onClick={() => setSelectedGroup('MEASUREMENTS')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      Measurements
                    </button>
                  </>
                ) : (
                  // Level 2: Items
                  <>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', background: 'rgba(0,0,0,0.04)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: '#999', cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ChevronLeft size={12} /> {selectedGroup}
                    </button>
                    {(selectedGroup === 'WEIGHTS'
                      ? ['ALL WEIGHTS', 'CHEST', 'BACK', 'LEGS']
                      : selectedGroup === 'CARDIO'
                      ? ['TRACKER', 'RUNNING', 'ROWING', 'CROSS TRAINER']
                      : ['CALORIES', 'FOOD', 'SCORE']
                    ).map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setCategoryOpen(false); setSelectedGroup(null); }}
                        style={{
                          width: '100%', padding: '10px 14px', textAlign: 'left',
                          border: 'none', background: category === cat ? 'rgba(0,0,0,0.06)' : 'transparent',
                          fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Period selector */}
          <div className="flex-1" style={{ position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setPeriodOpen(!periodOpen); setCategoryOpen(false); setSelectedGroup(null); }}
              style={pillStyle()}
            >
              {timePeriod}
              <ChevronDown size={12} />
            </button>
            {periodOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                backgroundColor: '#f2f2f2', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '10px', marginBottom: '4px', overflow: 'hidden', zIndex: 50,
                boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
              }}>
                {TIME_PERIODS.map(period => (
                  <button
                    key={period}
                    onClick={(e) => { e.stopPropagation(); setTimePeriod(period); setPeriodOpen(false); }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left',
                      border: 'none', background: timePeriod === period ? 'rgba(0,0,0,0.06)' : 'transparent',
                      fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                      cursor: 'pointer',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom metric cards */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          {/* Total card */}
          <div style={{ ...cardStyle, flex: '1 1 0' }}>
            <span style={{ fontSize: '8px', fontWeight: 500, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
              {metricLabel}
            </span>
            {isFood && (timePeriod === 'WEEKLY' || timePeriod === 'PERIOD') ? (
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', marginTop: 'auto', display: 'flex', alignItems: 'baseline' }}>
                <span>{foodScore}</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#999', marginLeft: '4px' }}>/{foodMaxScore}</span>
              </div>
            ) : showTotalWithAvg ? (
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', marginTop: 'auto', display: 'flex', alignItems: 'baseline' }}>
                <span>{displayTotal}</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#999', marginLeft: '4px' }}>/{avgDisplay}</span>
              </div>
            ) : (
              <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a1a', marginTop: 'auto' }}>
                {isFood ? foodAvgPerDay : displayTotal}
              </span>
            )}
          </div>

          {/* Week/Month number card with chevrons */}
          <div style={{ ...cardStyle, flex: '1 1 0', position: 'relative' }}>
            <span style={{ fontSize: '8px', fontWeight: 500, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', position: 'absolute', top: '12px', left: '16px' }}>
              {timePeriod === 'WEEKLY' ? 'WK' : timePeriod === 'MONTHLY' ? 'MT' : 'P'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
              <button
                onClick={() => {
                  if (isMonthMode) setMonthOffset(o => o - 1);
                  else setWeekOffset(o => o - 1);
                }}
                disabled={!canGoPrev}
                style={{
                  background: 'none', border: 'none', padding: '8px',
                  cursor: canGoPrev ? 'pointer' : 'default',
                  color: canGoPrev ? '#1a1a1a' : '#ccc',
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: '#1a1a1a', textAlign: 'center', flex: 1, lineHeight: 1.2 }}>
                {timePeriod === 'MONTHLY' ? getMonthInfo(selectedMonth).label : selectedWeek}
              </span>
              <button
                onClick={() => {
                  if (isMonthMode) setMonthOffset(o => o + 1);
                  else setWeekOffset(o => o + 1);
                }}
                disabled={!canGoNext}
                style={{
                  background: 'none', border: 'none', padding: '8px',
                  cursor: canGoNext ? 'pointer' : 'default',
                  color: canGoNext ? '#1a1a1a' : '#ccc',
                  display: 'flex', alignItems: 'center', flexShrink: 0,
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;900&family=Inconsolata:wght@200..900&display=swap');
      `}</style>
    </div>
  );
};
