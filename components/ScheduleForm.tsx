import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

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
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      setIsSubmitting(false);
      return;
    }

    if (!validateDays(formData.days)) {
      setError('Please enter valid days (MWF, TTH, M, T, W, TH, F, S)');
      setIsSubmitting(false);
      return;
    }

    if (!validateUnits(formData.units)) {
      setError('Please enter a valid number of units');
      setIsSubmitting(false);
      return;
    }

    const timeString = `${startTime}-${endTime}`;

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          time: timeString
        }),
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
      setStartTime(null);
      setEndTime(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding schedule:', err);
      setError('Failed to add schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    
    // Prevent non-numeric input for units
    if (name === 'units') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  const desktopFormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <TimePicker
          onChange={setStartTime}
          value={startTime}
          format="HH:mm"
          clearIcon={null}
          className="w-full"
          disableClock={false}
          isOpen={false}
          autoFocus={false}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">End Time</label>
        <TimePicker
          onChange={setEndTime}
          value={endTime}
          format="HH:mm"
          clearIcon={null}
          className="w-full"
          disableClock={false}
          isOpen={false}
          autoFocus={false}
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
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Please wait...' : 'Add Schedule'}
      </button>
    </form>
  );

  const mobileFormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <TimePicker
          onChange={setStartTime}
          value={startTime}
          format="HH:mm"
          clearIcon={null}
          className="w-full"
          disableClock={false}
          isOpen={false}
          autoFocus={false}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">End Time</label>
        <TimePicker
          onChange={setEndTime}
          value={endTime}
          format="HH:mm"
          clearIcon={null}
          className="w-full"
          disableClock={false}
          isOpen={false}
          autoFocus={false}
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
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          disabled={isSubmitting}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Please wait...' : 'Add Schedule'}
        </button>
      </div>
    </form>
  );

  return (
    <>
      {/* Mobile Add Button */}
      <div className="md:hidden p-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          Add New Schedule
        </button>
      </div>

      {/* Desktop Form */}
      <div className="hidden md:block p-4">
        {desktopFormContent}
      </div>

      {/* Mobile Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-100/30 backdrop-blur-[2px]" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    Add New Schedule
                  </Dialog.Title>
                  {mobileFormContent}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
