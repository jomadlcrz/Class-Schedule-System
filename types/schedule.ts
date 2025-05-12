export type Schedule = {
  _id: string;
  courseCode: string;
  descriptiveTitle: string;
  units: string;
  days: string;
  time: string;
  room: string;
  instructor: string;
};

export type SortField = 'courseCode' | 'descriptiveTitle' | 'units' | 'days' | 'time' | 'room' | 'instructor';
export type SortDirection = 'asc' | 'desc'; 