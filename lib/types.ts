export type AthleteStatus = 'active' | 'paused' | 'trial';

export type Athlete = {
  id: string;
  name: string;
  sport: 'Powerlifting' | 'Bodybuilding' | 'Olympic Weightlifting';
  coach: string;
  status: AthleteStatus;
  adherence: number;
  nextSession: string;
};

export type ProgramSlot = {
  day: string;
  title: string;
  focus: string;
};

export type ProgramTemplate = {
  id: string;
  name: string;
  phase: string;
  weeks: number;
  athletesAssigned: number;
  slots: ProgramSlot[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};
