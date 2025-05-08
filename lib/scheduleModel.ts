import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  descriptiveTitle: { type: String, required: true },
  units: { type: String, required: true },
  days: { type: String, required: true },
  time: { type: String, required: true },
  room: { type: String, required: true },
  instructor: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
