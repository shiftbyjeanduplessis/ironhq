import type { Athlete, DashboardMetric, ProgramTemplate } from '@/lib/types';

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Active athletes', value: '42', helper: '+5 in the last 30 days' },
  { label: 'Sessions due today', value: '18', helper: '6 need coach review' },
  { label: 'Average adherence', value: '87%', helper: 'Stable over last 4 weeks' },
  { label: 'PRs this month', value: '23', helper: 'Squat leading the board' },
];

export const athletes: Athlete[] = [
  {
    id: 'ath-001',
    name: 'Mia Daniels',
    sport: 'Powerlifting',
    coach: 'Jean',
    status: 'active',
    adherence: 94,
    nextSession: 'Today · 17:00',
  },
  {
    id: 'ath-002',
    name: 'Sam Mokoena',
    sport: 'Olympic Weightlifting',
    coach: 'Jean',
    status: 'active',
    adherence: 89,
    nextSession: 'Tomorrow · 06:00',
  },
  {
    id: 'ath-003',
    name: 'Leah Naidoo',
    sport: 'Bodybuilding',
    coach: 'Assistant coach',
    status: 'trial',
    adherence: 72,
    nextSession: 'Wed · 18:30',
  },
  {
    id: 'ath-004',
    name: 'Aiden Clarke',
    sport: 'Powerlifting',
    coach: 'Jean',
    status: 'paused',
    adherence: 41,
    nextSession: 'On hold',
  },
];

export const programs: ProgramTemplate[] = [
  {
    id: 'prg-001',
    name: '12 Week Meet Prep',
    phase: 'Peak strength',
    weeks: 12,
    athletesAssigned: 14,
    slots: [
      { day: 'Mon', title: 'Comp Squat + Bench', focus: 'Top single + backoff volume' },
      { day: 'Wed', title: 'Deadlift Pull', focus: 'Variation + accessories' },
      { day: 'Fri', title: 'Bench Volume', focus: 'High quality repetition work' },
    ],
  },
  {
    id: 'prg-002',
    name: 'Hypertrophy Foundation',
    phase: 'Accumulation',
    weeks: 8,
    athletesAssigned: 11,
    slots: [
      { day: 'Mon', title: 'Lower A', focus: 'Quads + glutes' },
      { day: 'Tue', title: 'Upper A', focus: 'Chest + delts + triceps' },
      { day: 'Thu', title: 'Lower B', focus: 'Posterior chain' },
      { day: 'Sat', title: 'Upper B', focus: 'Back + arms' },
    ],
  },
  {
    id: 'prg-003',
    name: 'Weightlifting Technical Base',
    phase: 'Skill accumulation',
    weeks: 6,
    athletesAssigned: 7,
    slots: [
      { day: 'Mon', title: 'Snatch Focus', focus: 'Positioning + pulls' },
      { day: 'Wed', title: 'Clean & Jerk', focus: 'Complexes + front squat' },
      { day: 'Fri', title: 'Power Variations', focus: 'Speed and precision' },
    ],
  },
];
