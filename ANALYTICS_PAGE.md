# Kine Analytics Page - Complete Reference

## Overview
The Analytics page (`/src/app/pages/Analytics.tsx`) is a standalone data visualization screen accessed via "Data+" from the Profile page. It uses a light theme completely separate from the dark main app.

## Route / Navigation
- Accessed from Profile page via `onNavigate('analytics')`
- In `App.tsx`, the `hideChrome` flag hides header, bottom nav, and safe-area padding on analytics
- Home button navigates back to dashboard: `onNavigate('dashboard')`

## Visual Design
- **Background**: `#f2f2f2` (off-white grey)
- **Font**: JetBrains Mono (loaded from Google Fonts: weights 300, 400, 500, 600, 900)
- **Text color**: `#1a1a1a` (near-black)
- **Card backgrounds**: `rgba(0,0,0,0.05)` (subtle grey)
- **Pill backgrounds**: `rgba(0,0,0,0.06)`
- **Bar chart**: Black bars (`#1a1a1a`) with opacity gradient based on value
- **Layout**: Fixed viewport height (`100vh`), no scrolling, flex column

## Top Bar
- Home icon button (left)
- "DATA+" label (center) - 14px, weight 700, letter-spacing 0.15em, uppercase
- Spacer div (right)

## Main Chart Area (flex: 1, centered vertically)
- **Big number**: 64px, weight 900, letter-spacing -0.04em - shows total metric
- **Label**: Right-aligned, 10px, grey, "total {metricLabel}"
- **Bar chart**: 180px height, vertical bars with opacity = 0.15 + (pct * 0.85)
- **X-axis labels**: Day names (Mon-Sun) or week labels, 9px, black

## Bottom Section

### Top Row: Two Selectors (side by side, equal width)
1. **Category picker**: CHEST, BACK, LEGS, TRACKER, RUNNING, ROWING, CALORIES, FOOD
2. **Period picker**: WEEKLY (default), MONTHLY, PERIOD

- Both open **upward** (dropdown appears above button to avoid clipping on iPhone)
- Pills: 10px, weight 600, black text, ChevronDown icon
- Dropdowns: background `#f2f2f2`, border, shadow, borderRadius 10px

### Bottom Row: Two Metric Cards (side by side, equal width with `flex: '1 1 0'`)

#### Left Card - Total Metric
- **Label**: Top-left, 8px, grey, "KG" / "KCAL" / "ENTRIES" / "KM"
- **Value**: 28px, weight 900, black - matches the big number above
- **Format**: Shows "15.4K" if >= 1000

#### Right Card - Week Number with Navigation
- **Label**: Top-left (absolute positioned), 8px, grey, "WK" / "M" / "P"
- **Left chevron**: `<` button, 18px, black, padding 8px
- **Week number**: 28px, weight 900, black, center flex
- **Right chevron**: `>` button, 18px, black, padding 8px
- Chevrons push week offset: left = older weeks, right = newer weeks

## State Management
```typescript
const [category, setCategory] = useState('CHEST');           // Exercise type
const [timePeriod, setTimePeriod] = useState('WEEKLY');      // WEEKLY, MONTHLY, PERIOD
const [weekOffset, setWeekOffset] = useState(0);             // Navigate weeks from current
const [monthOffset, setMonthOffset] = useState(0);           // Navigate months
const [currentWeek, setCurrentWeek] = useState(66);          // Latest week from Supabase
const [availableWeeks, setAvailableWeeks] = useState([]);    // All weeks with data
const [data, setData] = useState<DataPoint[]>([]);           // Chart data points
const [total, setTotal] = useState(0);                       // Total metric value
const [avgValue, setAvgValue] = useState(0);                 // Average per period
const [categoryOpen, setCategoryOpen] = useState(false);     // Dropdown open state
const [periodOpen, setPeriodOpen] = useState(false);         // Dropdown open state
```

## Supabase Integration
- **Week column**: Custom sequential week numbering (week 1 = Jan 6, 2025; week 66 = Apr 1-7, 2026)
- **Day column**: MON, TUE, WED, THU, FRI, SAT, SUN
- **Query structure**:
  - Cardio categories: filter by `exercises.exercise_name` matching category
  - Weight categories: filter by `type` = category
  - Calories: filter by `calories > 0`
  - Food: filter by `food_rating` exists
- **Data mapping**:
  - WEEKLY: 7 data points (Mon-Sun) mapped from `day` column
  - MONTHLY: 4 data points (weeks)
  - PERIOD: 8 data points (weeks)
- **Values**: `total_weight` for weights, `km`/`total_cardio` for cardio, `calories` for calories

## Key Logic
```typescript
const selectedWeek = currentWeek + weekOffset;  // Actual week being viewed

// WEEKLY: maps MON-SUN to 7 bars using day column
// MONTHLY: 4 weeks (current week - 3 to current)
// PERIOD: 8 weeks (current week - 7 to current)

// Data aggregation:
// - Sum values per day/week
// - Track non-zero count for average calculation
// - Format total: "15.4K" if >= 1000, otherwise raw number
```

## Category-to-Data Mapping
| Category | Data Source | Metric Label |
|----------|-------------|--------------|
| CHEST | `total_weight` where `type='CHEST'` | KG |
| BACK | `total_weight` where `type='BACK'` | KG |
| LEGS | `total_weight` where `type='LEGS'` | KG |
| TRACKER | `total_cardio` where `exercise_name='TRACKER'` | KM |
| RUNNING | `km` where `exercise_name='RUNNING'` | KM |
| ROWING | `total_cardio` where `exercise_name='ROWING'` | KM |
| CALORIES | `calories` where `calories > 0` | KCAL |
| FOOD | count rows where `food_rating` exists | ENTRIES |

## App.tsx Changes
```typescript
const hideChrome = currentPage === 'analytics';
// When hideChrome: no Header, no BottomNav, no main padding
// Analytics renders full-bleed with its own layout
```

## File Paths
- Page: `/src/app/pages/Analytics.tsx`
- App routing: `/src/app/App.tsx`
- Supabase client: `/src/lib/supabase.ts` (has `getISOWeek()` function)
