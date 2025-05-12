export * from './schedule';
export * from './api';

export type ScheduleFormData = {
  courseCode: string;
  descriptiveTitle: string;
  units: string;
  days: string;
  time: string;
  room: string;
  instructor: string;
}; 