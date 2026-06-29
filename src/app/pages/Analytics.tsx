import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronDown, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { supabase, getISOWeek } from '../../lib/supabase';
import { Page } from '../../types';
import { MaxStatsCard } from '../components/MaxStatsCard';
import { RunningManIcon, CaloriesIcon } from '../components/NavIcons';
import { DoubleArrowIcon } from '../components/DoubleArrowIcon';

const TIME_PERIODS = ['WEEKLY', 'MONTHLY', 'PERIOD'];

interface DataPoint {
  label: string;
  value: number;
}

interface AnalyticsProps {
  onNavigate: (page: Page) => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  page: Page;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ProfileUserIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fillRule="evenodd" clipRule="evenodd" d="M16.5 7.063C16.5 10.258 14.57 13 12 13c-2.572 0-4.5-2.742-4.5-5.938C7.5 3.868 9.16 2 12 2s4.5 1.867 4.5 5.063zM4.102 20.142C4.487 20.6 6.145 22 12 22c5.855 0 7.512-1.4 7.898-1.857a.416.416 0 0 0 .09-.317C19.9 18.944 19.106 15 12 15s-7.9 3.944-7.989 4.826a.416.416 0 0 0 .091.317z" fill="#1a1a1a" />
  </svg>
);

export const Analytics: React.FC<AnalyticsProps> = ({ onNavigate }) => {
  const [category, setCategory] = useState('RUNNING');
  const [timePeriod, setTimePeriod] = useState('WEEKLY');
  const [data, setData] = useState<DataPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [foodScore, setFoodScore] = useState(0);
  const [foodMaxScore, setFoodMaxScore] = useState(21);
  const [foodDaysWithRating, setFoodDaysWithRating] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [totalRaw, setTotalRaw] = useState(0);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // FIX: separate refs for category and period dropdowns
  const categoryRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
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

  const selectedWeek = (currentWeek ?? 0) + weekOffset;

  const getSelectedMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const selectedMonth = getSelectedMonth();

  const getMonthInfo = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const label = `${monthNames[month - 1]} ${year}`;
    return { daysInMonth, label };
  };

  // Set current week from today's date — deterministic, always correct
  useEffect(() => {
    setCurrentWeek(getISOWeek());
  }, []);

  // Load min/max week bounds from DB for navigation limits
  useEffect(() => {
    let cancelled = false;
    const loadBounds = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('week, date')
        .not('week', 'is', null)
        .order('week');

      if (data && data.length > 0 && !cancelled) {
        const weeks = [...new Set((data as any[]).map(r => r.week as number))].sort((a, b) => a - b);
        setMinWeek(weeks[0]);
        setMaxWeek(weeks[weeks.length - 1]);

        const dates = (data as any[]).map(r => r.date).filter(Boolean).sort();
        if (dates.length > 0) {
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          const toMonth = (d: string) => d.substring(0, 7);
          setMinMonth(toMonth(minDate));
          setMaxMonth(toMonth(maxDate));
        }
      }
    };
    loadBounds();
    return () => { cancelled = true; };
  }, []);

  // FIX: guard each close behind its own ref check so clicking inside a
  // dropdown does not immediately close it via the global mousedown listener.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
        setSelectedGroup(null);
      }
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
      const { daysInMonth } = getMonthInfo(selectedMonth);
      const [year, month] = selectedMonth.split('-').map(Number);
      dateStart = `${year}-${String(month).padStart(2, '0')}-01`;
      dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    } else {
      const startWeek = selectedWeek - 7;
      weekNumbers = Array.from({ length: 8 }, (_, i) => startWeek + i);
      labels = weekNumbers.map(w => `W${w}`);
    }

    let query;
    if (timePeriod === 'MONTHLY') {
      if (isCalories || isFood || isScore) {
        query = supabase.from('workouts').select('*').gte('date', dateStart!).lte('date', dateEnd!);
      } else if (isCardio) {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').gte('date', dateStart!).lte('date', dateEnd!);
      } else if (isTracker) {
        query = supabase.from('workouts').select('*').in('exercise_id', [82, 83, 87]).gte('date', dateStart!).lte('date', dateEnd!);
      } else if (isAllWeights) {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').in('type', ['CHEST', 'BACK', 'LEGS']).gte('date', dateStart!).lte('date', dateEnd!);
      } else {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').eq('type', category).gte('date', dateStart!).lte('date', dateEnd!);
      }
    } else {
      if (isCalories || isFood || isScore) {
        query = supabase.from('workouts').select('*').in('week', weekNumbers);
      } else if (isCardio) {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').in('week', weekNumbers);
      } else if (isTracker) {
        query = supabase.from('workouts').select('*').in('exercise_id', [82, 83, 87]).in('week', weekNumbers);
      } else if (isAllWeights) {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').in('type', ['CHEST', 'BACK', 'LEGS']).in('week', weekNumbers);
      } else {
        query = supabase.from('workouts').select('*, exercises(exercise_name)').eq('type', category).in('week', weekNumbers);
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
          matchCategory = name === (category === 'ROWING' ? 'ROW' : category === 'CROSS TRAINER' ? 'CROSS TRAINER' : category);
        } else if (isTracker) {
          matchCategory = true;
        } else {
          matchCategory = true;
        }

        if (!matchCategory) continue;

        sessionRows++;

        let idx: number;

        if (timePeriod === 'MONTHLY') {
          const dayOfMonth = parseInt(row.date.split('-')[2], 10);
          idx = dayOfMonth - 1;
        } else if (timePeriod === 'WEEKLY') {
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
             val = rating === 'GOOD' ? 3 : rating === 'OK' ? 2 : rating === 'BAD' ? 0 : 0;
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
      const raw = values[i];
      if (isCardio || isTracker) {
        return { label, value: +raw.toFixed(1) };
      }
      let val = Math.round(raw);
      if (isCalories && timePeriod === 'PERIOD') val = Math.round(val / 7);
      if (isScore && timePeriod === 'PERIOD') val = Math.round(val / 7);
      return { label, value: val };
    });
    setData(points);
    setTotal(Math.round(values.reduce((a, b) => a + b, 0)));

    const numWeeks = timePeriod === 'PERIOD' ? 8 : timePeriod === 'MONTHLY' ? 4 : 1;
    const avgWeeklyFood = timePeriod === 'MONTHLY' ? foodScoreTotal : Math.round(foodScoreTotal / numWeeks);
    setFoodScore(avgWeeklyFood);
    setFoodMaxScore(21);
    setFoodDaysWithRating(foodDaysWithRatingCount);

    setTotalRaw(rawTotal);
    setSessionCount(sessionRows);

    const nonZeroCount = count.filter(c => c > 0).length;
    setAvgValue(nonZeroCount > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / nonZeroCount) : 0);
  };

  useEffect(() => {
    if (currentWeek === null) return; // wait until loadData sets the real max week
    setWeekOffset(0);
    setMonthOffset(0);
    setSelectedBarIdx(null);
    setSessionCount(0);
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, timePeriod, currentWeek, currentMonth]);

  useEffect(() => {
    if (currentWeek === null) return;
    loadChartData();
  }, [weekOffset, monthOffset, timePeriod]);

  const minValue = Math.min(...data.map(d => d.value), 0);
  const maxValue = Math.max(...data.map(d => d.value), minValue + 1);
  const metricLabel = isCalories ? 'KCAL' : isFood ? 'SCORE' : isScore ? 'SC' : (isCardio || isTracker ? 'KM' : 'KG');

   const foodAvgPerDay = timePeriod === 'MONTHLY' && foodDaysWithRating > 0 ? (foodScore / foodDaysWithRating).toFixed(1) : '0.0';

   const foodPercentage = isFood ? (
     timePeriod === 'WEEKLY' ? foodScore / 21 :
     timePeriod === 'MONTHLY' ? parseFloat(foodAvgPerDay) / 3 :
     timePeriod === 'PERIOD' ? foodScore / 21 : 0
   ) : 0;

   const caloriesPeriodDaily = isCalories && timePeriod === 'PERIOD' ? Math.round(totalRaw / 49) : null;
   const scorePeriodDaily = isScore && timePeriod === 'PERIOD' ? Math.round(totalRaw / 49) : null;

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

  const daysWithData = data.filter(d => d.value > 0).length;
  const trackerMonthlyAvg = isTracker && timePeriod === 'MONTHLY' && daysWithData > 0
    ? (totalRaw / daysWithData).toFixed(1)
    : '';
  const cardioPeriodAvg = (isCardio || isTracker) && timePeriod === 'PERIOD' && daysWithData > 0
    ? (totalRaw / daysWithData).toFixed(1)
    : '';

  const showTotalWithAvg = (isTracker && timePeriod === 'MONTHLY') || ((isCardio || isTracker) && timePeriod === 'PERIOD');
  const avgDisplay = isTracker && timePeriod === 'MONTHLY' ? trackerMonthlyAvg : cardioPeriodAvg;

  const isMonthMode = timePeriod === 'MONTHLY';
  const canGoPrev = isMonthMode
    ? minMonth === null || selectedMonth > minMonth
    : minWeek === null || selectedWeek > minWeek;
  const canGoNext = isMonthMode
    ? maxMonth === null || selectedMonth < currentMonth
    : maxWeek === null || selectedWeek < (currentWeek ?? 0);

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home size={20} />, page: 'dashboard' },
    { label: 'Weights', icon: (
      <svg width={20} height={20} viewBox="0 0 122.88 122.88" fill="currentColor">
        <path d="M1.61,97.18l5.38-5.38c0.14-0.14,0.29-0.27,0.44-0.4l-3.86-3.86v0c-0.06-0.06-0.11-0.12-0.16-0.18c-0.96-1.05-1.44-2.38-1.44-3.7c0-1.4,0.54-2.8,1.61-3.87l0,0l0,0l0,0l5.38-5.38l0,0c0.14-0.14,0.29-0.27,0.44-0.4l-3.86-3.86h0c-1.07-1.07-1.6-2.48-1.6-3.88c0-1.4,0.54-2.8,1.6-3.87l0,0l0,0l0,0l5.38-5.38c1.07-1.07,2.48-1.6,3.88-1.6c1.41,0,2.81,0.53,3.88,1.6l47.21,47.21c1.07,1.07,1.6,2.48,1.6,3.88c0,1.41-0.53,2.81-1.6,3.88l-5.38,5.38v0c-0.06,0.06-0.12,0.11-0.18,0.16c-1.05,0.96-2.38,1.44-3.7,1.44c-1.4,0-2.8-0.54-3.87-1.6l0,0l0,0l0,0l-3.27-3.27c-0.12,0.15-0.25,0.3-0.39,0.44l0,0l0,0l-5.38,5.38h0c-0.06,0.06-0.12,0.11-0.18,0.16c-1.04,0.95-2.37,1.43-3.7,1.43c-1.41,0-2.81-0.53-3.87-1.6l0,0l0,0l0,0l-4.46-4.46c-0.12,0.15-0.25,0.3-0.4,0.44l-5.38,5.38c-1.07,1.07-2.48,1.6-3.88,1.6c-1.4,0-2.81-0.53-3.88-1.6L1.61,104.95C0.54,103.88,0,102.47,0,101.07C0,99.66,0.54,98.26,1.61,97.18L1.61,97.18zM65.85,8.98l-5.38,5.38h0l-0.05,0.05c-0.08,0.11-0.12,0.24-0.12,0.37c0,0.15,0.06,0.31,0.17,0.42h0l47.21,47.21c0.11,0.11,0.26,0.17,0.42,0.17c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38l0,0l0.05-0.05c0.08-0.1,0.12-0.24,0.12-0.37c0-0.16-0.05-0.31-0.16-0.42l0,0l0,0l-7.13-7.13v0L74.41,16.71l-7.72-7.72v0c-0.11-0.11-0.26-0.17-0.42-0.17C66.11,8.81,65.96,8.87,65.85,8.98zM71.47,47.31c1.34-1.34,3.52-1.34,4.87,0c1.34,1.34,1.34,3.52,0,4.87L52.74,75.76c-1.34,1.34-3.52,1.34-4.87,0c-1.34-1.34-1.34-3.52,0-4.87L71.47,47.31zM100.65,5.07l-5.38,5.38l0,0c-0.12,0.12-0.18,0.27-0.18,0.42c0,0.13,0.04,0.25,0.12,0.36l0.06,0.06l0,0h0l16.32,16.32l0,0l0.05,0.05c0.1,0.08,0.23,0.11,0.36,0.11c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38v0c0.12-0.12,0.18-0.27,0.18-0.42c0-0.15-0.06-0.31-0.17-0.42l0,0v0L101.49,5.07l0,0c-0.11-0.11-0.26-0.17-0.42-0.17S100.76,4.96,100.65,5.07zM91.81,6.98l5.38-5.38l0,0c1.07-1.07,2.48-1.6,3.88-1.6s2.81,0.53,3.88,1.6l0,0l16.32,16.32h0l0,0l0,0c1.06,1.06,1.6,2.47,1.59,3.87c0,1.41-0.53,2.82-1.59,3.88h0l-5.38,5.38c-0.14,0.14-0.29,0.27-0.44,0.4l4.46,4.46c1.07,1.07,1.6,2.48,1.6,3.88c0,1.41-0.54,2.81-1.6,3.88l-5.38,5.38l0,0l0,0l0,0c-0.14,0.14-0.29,0.27-0.44,0.39l3.27,3.27l0,0l0,0c1.07,1.07,1.6,2.47,1.6,3.87c0,1.33-0.48,2.66-1.44,3.7c-0.05,0.06-0.1,0.12-0.16,0.18l0,0l-5.38,5.38c-1.07,1.07-2.48,1.6-3.88,1.6c-1.41,0-2.81-0.54-3.88-1.6L57.01,18.66v0c-1.07-1.07-1.61-2.48-1.61-3.88c0-1.33,0.48-2.66,1.44-3.7c0.05-0.06,0.1-0.12,0.16-0.18l0,0l5.38-5.38l0,0l0,0c1.07-1.07,2.47-1.6,3.87-1.6c1.41,0,2.81,0.54,3.88,1.6l0,0l3.86,3.86c0.12-0.15,0.25-0.3,0.4-0.44l5.38-5.38c1.07-1.07,2.48-1.61,3.88-1.61c1.41,0,2.81,0.54,3.88,1.61l3.86,3.86C91.54,7.27,91.67,7.12,91.81,6.98zM83.25,7.03l-5.38,5.38c-0.11,0.11-0.17,0.26-0.17,0.42c0,0.15,0.05,0.3,0.16,0.41l0.01,0.01l32.36,32.36h0c0.11,0.11,0.26,0.17,0.42,0.17c0.16,0,0.31-0.05,0.42-0.16l0,0h0l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.15-0.06-0.31-0.17-0.42l-8.31-8.31l0,0l0,0l0,0l0,0L84.09,7.03c-0.11-0.11-0.27-0.17-0.42-0.17C83.51,6.86,83.36,6.91,83.25,7.03zM16.71,74.41l0,0l32.36,32.36l0,0l0,0l0,0l0,0l0,0l0,0l0,0l7.11,7.11l0,0l0,0c0.11,0.11,0.27,0.16,0.42,0.16c0.13,0,0.26-0.04,0.37-0.12l0.05-0.05v0l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.15-0.06-0.31-0.17-0.42L15.2,60.47c-0.11-0.11-0.26-0.17-0.42-0.17c-0.15,0-0.31,0.06-0.42,0.17l-5.38,5.38v0l0,0c-0.11,0.11-0.16,0.27-0.16,0.42c0,0.15,0.06,0.31,0.17,0.42v0zM45.66,110.29l-0.05-0.05L13.24,77.87l0,0l-0.06-0.06c-0.11-0.08-0.23-0.12-0.36-0.12c-0.15,0-0.3,0.06-0.42,0.18l-5.38,5.38v0l0,0c-0.11,0.11-0.16,0.27-0.16,0.42c0,0.13,0.04,0.26,0.12,0.37l0.05,0.05v0l7.72,7.72l16.32,16.32l8.32,8.32l0,0l0,0c0.12,0.12,0.27,0.17,0.42,0.17c0.13,0,0.26-0.04,0.37-0.12l0.05-0.05h0l5.38-5.38l0,0c0.11-0.11,0.16-0.27,0.16-0.42C45.77,110.52,45.73,110.39,45.66,110.29zM10.45,95.27l-5.38,5.38c-0.11,0.11-0.17,0.26-0.17,0.42s0.06,0.31,0.17,0.42l16.32,16.32c0.11,0.11,0.26,0.17,0.42,0.17c0.15,0,0.31-0.06,0.42-0.17l5.38-5.38c0.11-0.11,0.17-0.26,0.17-0.42c0-0.16-0.06-0.31-0.17-0.42L11.28,95.27l-0.01-0.01c-0.11-0.11-0.26-0.16-0.41-0.16C10.71,95.1,10.56,95.16,10.45,95.27z"/>
      </svg>
    ), page: 'weights' },
    { label: 'Cardio', icon: <RunningManIcon size={24} color="#1a1a1a" />, page: 'cardio' },
    { label: 'Calories', icon: <CaloriesIcon size={20} color="#1a1a1a" />, page: 'calories' },
    { label: 'Profile', icon: <ProfileUserIcon size={20} />, page: 'profile' },
  ];

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
        overflow: 'auto',
        backgroundColor: '#f2f2f2',
        color: '#1a1a1a',
        fontFamily: "'JetBrains Mono', monospace",
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '16px', paddingTop: '16px', position: 'relative' }}>
        {/* Left: hamburger */}
        <div style={{ width: 48, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1a1a1a' }}
          >
            <Menu size={22} />
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 'calc(100% + 4px)',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '24px',
                  padding: '10px 16px',
                  backgroundColor: '#f2f2f2',
                  borderRadius: '999px',
                  animation: 'fadeIn 0.15s ease-out',
                  zIndex: 100,
                  alignItems: 'center',
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onNavigate(item.page);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: DATA+ */}
        <div style={{ flex: 1, textAlign: 'center', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', color: '#1a1a1a', textTransform: 'uppercase' }}>
            DATA+
          </span>
        </div>

        {/* Right: KINÉ */}
        <div style={{ width: 48, textAlign: 'right', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: menuOpen ? 'none' : 'auto' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 530,
            fontFamily: "'Archivo', sans-serif",
            fontStretch: '200%',
            letterSpacing: '0.8em',
            lineHeight: '1',
            color: '#1a1a1a',
            textTransform: 'uppercase',
          }}>
            KINÉ
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="px-5" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '16px' }}>
        {/* Period header */}
        <div style={{ fontFamily: "'Inconsolata', monospace", fontSize: '32px', fontWeight: 348, fontStretch: '175%', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.2)', textTransform: 'uppercase', marginBottom: '8px' }}>
          {timePeriod === 'WEEKLY' ? `WEEK ${selectedWeek}` : timePeriod === 'MONTHLY' ? getMonthInfo(selectedMonth).label : 'PERIOD'}
        </div>

        {/* Big number */}
        <div className="flex items-start justify-between" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
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
            {isFood && ['WEEKLY', 'MONTHLY', 'PERIOD'].includes(timePeriod) && foodPercentage > 0 && (
              <svg width={40} height={40} viewBox="0 0 40 40">
                {Array.from({ length: 20 }, (_, i) => {
                  const angle = (i / 20) * 2 * Math.PI - Math.PI / 2;
                  const cx = 20;
                  const cy = 20;
                  const r = 15;
                  const x = cx + r * Math.cos(angle);
                  const y = cy + r * Math.sin(angle);
                  const filled = Math.round(foodPercentage * 20);
                  return (
                    <circle
                      key={i}
                      cx={x} cy={y} r={1.8}
                      fill={i < filled ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.1)'}
                    />
                  );
                })}
                <text x={20} y={23} textAnchor="middle" fill="rgba(0,0,0,0.8)" fontSize="8" fontWeight="700">
                  {Math.round(foodPercentage * 100)}%
                </text>
              </svg>
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
               {isScore || isFood ? d.value.toLocaleString() : `${(isCardio || isTracker) ? d.value.toFixed(1) : d.value.toLocaleString()} ${metricLabel}`}
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

      {/* Weights+ link */}
      {category === 'RUNNING' && (
        <div className="px-5" style={{ paddingTop: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => onNavigate('running-plus')}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}
          >
            <DoubleArrowIcon size={18} />
            Running +
          </button>
        </div>
      )}

      {/* Weights+ link */}
      {['ALL WEIGHTS', 'CHEST', 'BACK', 'LEGS'].includes(category) && (
        <div className="px-5" style={{ paddingTop: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => onNavigate('weights-plus')}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#1a1a1a',
              textTransform: 'uppercase',
            }}
          >
            <DoubleArrowIcon size={18} />
            Weights +
          </button>
        </div>
      )}

      {/* Selectors + metric cards */}
      <div className="px-5" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingTop: '8px' }}>
        {/* Two selectors side by side */}
        <div className="flex gap-2 mb-2">
          {/* Category selector — FIX: attach categoryRef here */}
          <div className="flex-1 relative" style={{ position: 'relative' }} ref={categoryRef}>
            <button
              onClick={() => {
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
              disabled={categoryOpen}
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
                  <>
                    <div
                      onClick={() => setSelectedGroup('WEIGHTS')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                      role="button"
                      tabIndex={0}
                    >
                      Weights
                    </div>
                    <div
                      onClick={() => setSelectedGroup('CARDIO')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                      role="button"
                      tabIndex={0}
                    >
                      Cardio
                    </div>
                    <div
                      onClick={() => setSelectedGroup('MEASUREMENTS')}
                      style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', cursor: 'pointer', textTransform: 'uppercase' }}
                      role="button"
                      tabIndex={0}
                    >
                      Measurements
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      onClick={() => setSelectedGroup(null)}
                      style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', background: 'rgba(0,0,0,0.04)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: '#999', cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}
                      role="button"
                      tabIndex={0}
                    >
                      <ChevronLeft size={12} /> {selectedGroup}
                    </div>
                    {(selectedGroup === 'WEIGHTS'
                      ? ['ALL WEIGHTS', 'CHEST', 'BACK', 'LEGS']
                      : selectedGroup === 'CARDIO'
                      ? ['TRACKER', 'RUNNING', 'ROWING', 'CROSS TRAINER']
                      : ['CALORIES', 'FOOD', 'SCORE']
                    ).map(cat => (
                      <div
                        key={cat}
                        onClick={() => { setCategory(cat); setCategoryOpen(false); setSelectedGroup(null); }}
                        style={{
                          width: '100%', padding: '10px 14px', textAlign: 'left',
                          border: 'none', background: category === cat ? 'rgba(0,0,0,0.06)' : 'transparent',
                          fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#1a1a1a',
                          cursor: 'pointer',
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {cat}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Period selector — FIX: attach periodRef here */}
          <div className="flex-1" style={{ position: 'relative' }} ref={periodRef}>
            <button
              onClick={() => { setPeriodOpen(!periodOpen); setCategoryOpen(false); setSelectedGroup(null); }}
              disabled={periodOpen}
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
                    onClick={() => { setTimePeriod(period); setPeriodOpen(false); }}
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
