import { useState } from 'react';

type ScheduleFormData = {
  courseCode: string;
  descriptiveTitle: string;
  units: string;
  days: string;
  time: string;
  room: string;
  instructor: string;
};

type Schedule = {
  _id: string;
  courseCode: string;
  descriptiveTitle: string;
  units: string;
  days: string;
  time: string;
  room: string;
  instructor: string;
};

export default function ScheduleForm({ onAdded }: { onAdded: (callback: (prev: Schedule[]) => Schedule[]) => void }) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    courseCode: '',
    descriptiveTitle: '',
    units: '',
    days: '',
    time: '',
    room: '',
    instructor: ''
  });
  const [error, setError] = useState('');

  function validateTime(time: string) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  function validateDays(days: string) {
    const validPatterns = ['MWF', 'TTH', 'M', 'T', 'W', 'TH', 'F', 'S'];
    return validPatterns.includes(days.toUpperCase());
  }

  function validateUnits(units: string) {
    return !isNaN(Number(units)) && Number(units) > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateTime(formData.time)) {
      setError('Please enter a valid time range in 24-hour format (HH:MM-HH:MM)');
      return;
    }

    if (!validateDays(formData.days)) {
      setError('Please enter valid days (MWF, TTH, M, T, W, TH, F, S)');
      return;
    }

    if (!validateUnits(formData.units)) {
      setError('Please enter a valid number of units');
      return;
    }

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to add schedule');
      }

      const data = await res.json();
      onAdded((prev) => [...prev, data]);
      setFormData({
        courseCode: '',
        descriptiveTitle: '',
        units: '',
        days: '',
        time: '',
        room: '',
        instructor: ''
      });
    } catch (err) {
      console.error('Error adding schedule:', err);
      setError('Failed to add schedule. Please try again.');
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <input
          name="courseCode"
          value={formData.courseCode}
          onChange={handleChange}
          placeholder="Course Code"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="descriptiveTitle"
          value={formData.descriptiveTitle}
          onChange={handleChange}
          placeholder="Descriptive Title"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="units"
          value={formData.units}
          onChange={handleChange}
          placeholder="Units"
          required
          type="number"
          min="1"
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="days"
          value={formData.days}
          onChange={handleChange}
          placeholder="Days (e.g., MWF, TTH)"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="time"
          value={formData.time}
          onChange={handleChange}
          placeholder="Time (e.g., 8:00-9:00)"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="room"
          value={formData.room}
          onChange={handleChange}
          placeholder="Room"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <input
          name="instructor"
          value={formData.instructor}
          onChange={handleChange}
          placeholder="Instructor"
          required
          className="w-full p-2 border rounded"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
      >
        Add Schedule
      </button>
    </form>
  );
}
