import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setIsModalOpen(false);
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

  const formContent = (
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
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
      >
        Add Schedule
      </button>
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
        {formContent}
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
                  {formContent}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
