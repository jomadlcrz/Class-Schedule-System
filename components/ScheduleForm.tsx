import { useState, useEffect } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import { PlusIcon, ChevronUpDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import debounce from 'lodash/debounce';
import { Schedule, ScheduleFormData } from '@/types';
import { generateTimeOptions, parseTimeToMinutes } from '@/utils/time';

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
  const [validationErrors, setValidationErrors] = useState<{
    courseCode?: string;
    descriptiveTitle?: string;
  }>({});

  const timeOptions = generateTimeOptions();

  const filteredStartTimes = startTimeQuery === ''
    ? timeOptions
    : timeOptions.filter((time) =>
        time.toLowerCase().includes(startTimeQuery.toLowerCase())
      );

  const filteredEndTimes = endTimeQuery === ''
    ? timeOptions.filter(time => {
        if (!startTime) return true;
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
      })
    : timeOptions.filter((time) => {
        if (!time.toLowerCase().includes(endTimeQuery.toLowerCase())) return false;
        if (!startTime) return true;
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
      });

  // Debounced validation function
  const validateField = debounce(async (field: 'courseCode' | 'descriptiveTitle', value: string) => {
    if (!value) return;

    try {
      const checkRes = await fetch('/api/schedule/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value
        }),
      });

      const { isDuplicate, field: duplicateField } = await checkRes.json();
      
      if (isDuplicate) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: `${duplicateField} already exists. Please use a different ${duplicateField.toLowerCase()}.`
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
    }
  }, 500);

  // Clear validation errors when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setValidationErrors({});
    }
  }, [isModalOpen]);

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

    if (!validateUnits(formData.units)) {
      setError('Please enter a valid number of units');
      setIsSubmitting(false);
      return;
    }

    // Check for duplicates
    try {
      const checkRes = await fetch('/api/schedule/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: formData.courseCode,
          descriptiveTitle: formData.descriptiveTitle
        }),
      });

      const { isDuplicate, field } = await checkRes.json();
      
      if (isDuplicate) {
        setValidationErrors(prev => ({
          ...prev,
          [field.toLowerCase()]: `${field} already exists. Please use a different ${field.toLowerCase()}.`
        }));
        setIsSubmitting(false);
        return;
      }

      const timeString = `${startTime}-${endTime}`;

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
    
    // Clear error when input changes
    setError('');
    
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

    // Clear validation error if input is empty
    if ((name === 'courseCode' || name === 'descriptiveTitle') && !value) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
      return;
    }

    // Validate course code and descriptive title in real-time
    if (name === 'courseCode' || name === 'descriptiveTitle') {
      validateField(name, value);
    }
  }

  const hasFormValues = () => {
    return Object.values(formData).some(value => value !== '') || startTime || endTime;
  };

  return (
    <>
      {/* Add Button - Now visible on both mobile and desktop */}
      <div 
        className="p-0"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md transition-all cursor-pointer text-sm font-medium enable-mobile-hover hover:opacity-80 active:bg-blue-700 mx-auto"
        >
          <PlusIcon className="h-5 w-5" />
          Add New Schedule
        </button>
      </div>

      {/* Modal - Used for both mobile and desktop */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-10" 
          onClose={() => {
            if (!hasFormValues()) {
              setIsModalOpen(false);
            }
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 enable-mobile-hover hover:text-gray-600 active:bg-gray-100 focus:outline-none transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4 pr-8"
                  >
                    Add New Schedule
                  </Dialog.Title>
                  <form 
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                  >
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
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200 ${validationErrors.courseCode ? 'border-red-500' : ''}`}
                      />
                      {validationErrors.courseCode && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.courseCode}</p>
                      )}
                    </div>
                    <div>
                      <input
                        name="descriptiveTitle"
                        value={formData.descriptiveTitle}
                        onChange={handleChange}
                        placeholder="Descriptive Title"
                        required
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200 ${validationErrors.descriptiveTitle ? 'border-red-500' : ''}`}
                      />
                      {validationErrors.descriptiveTitle && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.descriptiveTitle}</p>
                      )}
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <input
                        name="days"
                        value={formData.days}
                        onChange={handleChange}
                        placeholder="Days (e.g., MWF, TTH)"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-gray-700">Time</label>
                      <div className="flex flex-row items-center gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <Combobox value={startTime} onChange={(value) => {
                            setStartTime(value);
                            setEndTime(null);
                            setEndTimeQuery('');
                          }}>
                            <div className="relative">
                              <Combobox.Button className="w-full px-4 py-2.5 border border-gray-300 rounded-lg flex justify-between items-center bg-white hover:border-gray-400 transition-all duration-200">
                                <span className={(startTime ? 'text-gray-700' : 'text-gray-400') + ' truncate'}>
                                  {startTime || 'Select start time'}
                                </span>
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" aria-hidden="true" />
                              </Combobox.Button>
                              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {filteredStartTimes.map((time) => (
                                  <Combobox.Option
                                    key={time}
                                    value={time}
                                    className={({ active }) =>
                                      `relative cursor-pointer select-none py-2.5 pl-10 pr-4 ${
                                        active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                      }`
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {time}
                                        </span>
                                        {selected ? (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </Combobox.Option>
                                ))}
                              </Combobox.Options>
                            </div>
                          </Combobox>
                        </div>
                        <span className="text-gray-400 flex-shrink-0">-</span>
                        <div className="flex-1 min-w-0">
                          <Combobox value={endTime} onChange={setEndTime} disabled={!startTime}>
                            <div className="relative">
                              <Combobox.Button className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg flex justify-between items-center ${!startTime ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'} transition-all duration-200`} disabled={!startTime}>
                                <span className={(!startTime ? 'text-gray-400' : endTime ? 'text-gray-700' : 'text-gray-400') + ' truncate'}>
                                  {startTime ? (endTime || 'Select end time') : 'Select start time first'}
                                </span>
                                <ChevronUpDownIcon className={`h-5 w-5 ml-2 flex-shrink-0 ${!startTime ? 'text-gray-300' : 'text-gray-400'}`} aria-hidden="true" />
                              </Combobox.Button>
                              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {filteredEndTimes.map((time) => (
                                  <Combobox.Option
                                    key={time}
                                    value={time}
                                    className={({ active }) =>
                                      `relative cursor-pointer select-none py-2.5 pl-10 pr-4 ${
                                        active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                      }`
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {time}
                                        </span>
                                        {selected ? (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </Combobox.Option>
                                ))}
                              </Combobox.Options>
                            </div>
                          </Combobox>
                        </div>
                      </div>
                    </div>
                    <div>
                      <input
                        name="room"
                        value={formData.room}
                        onChange={handleChange}
                        placeholder="Room"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <input
                        name="instructor"
                        value={formData.instructor}
                        onChange={handleChange}
                        placeholder="Instructor"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])}
                      className="w-full inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 enable-mobile-hover hover:opacity-80 active:bg-blue-700 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          Please wait...
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </>
                      ) : 'Add Schedule'}
                    </button>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
