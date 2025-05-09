import { useState } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import { PlusIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
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

function generateTimeOptions() {
  const times = [];
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(time);
    }
  }
  return times;
}

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
  const [startTimeQuery, setStartTimeQuery] = useState('');
  const [endTimeQuery, setEndTimeQuery] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeOptions = generateTimeOptions();

  const filteredStartTimes = startTimeQuery === ''
    ? timeOptions
    : timeOptions.filter((time) =>
        time.toLowerCase().includes(startTimeQuery.toLowerCase())
      );

  const filteredEndTimes = endTimeQuery === ''
    ? timeOptions
    : timeOptions.filter((time) =>
        time.toLowerCase().includes(endTimeQuery.toLowerCase())
      );

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
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
    >
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-2 bg-red-100 text-red-700 rounded"
        >
          {error}
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <input
          name="courseCode"
          value={formData.courseCode}
          onChange={handleChange}
          placeholder="Course Code"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <input
          name="descriptiveTitle"
          value={formData.descriptiveTitle}
          onChange={handleChange}
          placeholder="Descriptive Title"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
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
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <input
          name="days"
          value={formData.days}
          onChange={handleChange}
          placeholder="Days (e.g., MWF, TTH)"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <Combobox value={startTime} onChange={setStartTime}>
          <div className="relative">
            <Combobox.Input
              className="w-full p-2 border rounded"
              onChange={(event) => setStartTimeQuery(event.target.value)}
              displayValue={(time: string) => time || ''}
              placeholder="Select start time"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredStartTimes.map((time) => (
                <Combobox.Option
                  key={time}
                  value={time}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    }`
                  }
                >
                  {time}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      </motion.div>
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <label className="block text-sm font-medium text-gray-700">End Time</label>
        <Combobox value={endTime} onChange={setEndTime}>
          <div className="relative">
            <Combobox.Input
              className="w-full p-2 border rounded"
              onChange={(event) => setEndTimeQuery(event.target.value)}
              displayValue={(time: string) => time || ''}
              placeholder="Select end time"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredEndTimes.map((time) => (
                <Combobox.Option
                  key={time}
                  value={time}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    }`
                  }
                >
                  {time}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <input
          name="room"
          value={formData.room}
          onChange={handleChange}
          placeholder="Room"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.8 }}
      >
        <input
          name="instructor"
          value={formData.instructor}
          onChange={handleChange}
          placeholder="Instructor"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      
      <motion.button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.9 }}
      >
        {isSubmitting ? 'Please wait...' : 'Add Schedule'}
      </motion.button>
    </motion.form>
  );

  const mobileFormContent = (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-2 bg-red-100 text-red-700 rounded"
        >
          {error}
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <input
          name="courseCode"
          value={formData.courseCode}
          onChange={handleChange}
          placeholder="Course Code"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <input
          name="descriptiveTitle"
          value={formData.descriptiveTitle}
          onChange={handleChange}
          placeholder="Descriptive Title"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
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
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <input
          name="days"
          value={formData.days}
          onChange={handleChange}
          placeholder="Days (e.g., MWF, TTH)"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <Combobox value={startTime} onChange={setStartTime}>
          <div className="relative">
            <Combobox.Input
              className="w-full p-2 border rounded"
              onChange={(event) => setStartTimeQuery(event.target.value)}
              displayValue={(time: string) => time || ''}
              placeholder="Select start time"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredStartTimes.map((time) => (
                <Combobox.Option
                  key={time}
                  value={time}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    }`
                  }
                >
                  {time}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      </motion.div>
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <label className="block text-sm font-medium text-gray-700">End Time</label>
        <Combobox value={endTime} onChange={setEndTime}>
          <div className="relative">
            <Combobox.Input
              className="w-full p-2 border rounded"
              onChange={(event) => setEndTimeQuery(event.target.value)}
              displayValue={(time: string) => time || ''}
              placeholder="Select end time"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredEndTimes.map((time) => (
                <Combobox.Option
                  key={time}
                  value={time}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    }`
                  }
                >
                  {time}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </div>
        </Combobox>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <input
          name="room"
          value={formData.room}
          onChange={handleChange}
          placeholder="Room"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.8 }}
      >
        <input
          name="instructor"
          value={formData.instructor}
          onChange={handleChange}
          placeholder="Instructor"
          required
          className="w-full p-2 border rounded"
        />
      </motion.div>
      
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={() => setIsModalOpen(false)}
          disabled={isSubmitting}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 1 }}
        >
          {isSubmitting ? 'Please wait...' : 'Add Schedule'}
        </motion.button>
      </div>
    </motion.form>
  );

  return (
    <>
      {/* Mobile Add Button */}
      <motion.div 
        className="md:hidden p-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <PlusIcon className="h-5 w-5" />
          Add New Schedule
        </button>
      </motion.div>

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
