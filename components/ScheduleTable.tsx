import { useState } from 'react';
import { PencilSquareIcon, TrashIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

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
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const time = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      times.push(time);
    }
  }
  return times;
}

export default function ScheduleTable({ schedules, onChange }: { schedules: Schedule[], onChange: (callback: (prev: Schedule[]) => Schedule[]) => void }) {
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Schedule | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [startTimeQuery, setStartTimeQuery] = useState('');
  const [endTimeQuery, setEndTimeQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const timeOptions = generateTimeOptions();

  const filteredStartTimes = startTimeQuery === ''
    ? timeOptions
    : timeOptions.filter((time) =>
        time.toLowerCase().includes(startTimeQuery.toLowerCase())
      );

  const filteredEndTimes = endTimeQuery === ''
    ? timeOptions.filter(time => {
        if (!startTime) return true;
        const parseTimeToMinutes = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let totalMinutes = hours * 60 + minutes;
          if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
          if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
          return totalMinutes;
        };
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
      })
    : timeOptions.filter((time) => {
        if (!time.toLowerCase().includes(endTimeQuery.toLowerCase())) return false;
        if (!startTime) return true;
        const parseTimeToMinutes = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let totalMinutes = hours * 60 + minutes;
          if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
          if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
          return totalMinutes;
        };
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
      });

  function parseTime(timeString: string): { start: string | null; end: string | null } {
    const [start, end] = timeString.split('-');
    return { start: start || null, end: end || null };
  }

  function validateTime(start: string, end: string) {
    const parseTimeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
      return totalMinutes;
    };

    const startTotalMinutes = parseTimeToMinutes(start);
    const endTotalMinutes = parseTimeToMinutes(end);
    
    return startTotalMinutes < endTotalMinutes;
  }

  async function handleDelete(id: string) {
    if (!id) {
      setError('Invalid schedule ID');
      return;
    }

    try {
      const res = await fetch(`/api/schedule/${id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete schedule');
      }

      onChange((prev) => prev.filter((item) => item._id !== id));
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  }

  async function handleEdit(id: string) {
    if (!id) {
      setError('Invalid schedule ID');
      return;
    }

    const schedule = schedules.find(s => s._id === id);
    if (schedule) {
      setEditingId(id);
      setEditForm(schedule);
      const { start, end } = parseTime(schedule.time);
      setStartTime(start);
      setEndTime(end);
      setIsEditModalOpen(true);
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm) return;
    setIsSaving(true);

    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      setIsSaving(false);
      return;
    }

    const timeString = `${startTime}-${endTime}`;

    try {
      const res = await fetch(`/api/schedule/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          time: timeString
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update schedule');
      }

      onChange((prev) => {
        const newSchedules = prev.map(item => 
          item._id === editingId ? { ...item, ...data } : item
        );
        return newSchedules;
      });

      setIsEditModalOpen(false);
      setEditingId(null);
      setEditForm(null);
      setStartTime(null);
      setEndTime(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setIsEditModalOpen(false);
    setEditingId(null);
    setEditForm(null);
    setStartTime(null);
    setEndTime(null);
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editForm) return;
    const { name, value } = e.target;
    
    // Prevent non-numeric input for units
    if (name === 'units') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setEditForm(prev => prev ? { ...prev, [name]: numericValue } : null);
      return;
    }
    
    setEditForm(prev => prev ? { ...prev, [name]: value } : null);
  }

  function openDeleteModal(id: string) {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  }

  return (
    <div>
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 p-2 bg-red-100 text-red-700 rounded"
        >
          {error}
        </motion.div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {schedules.map((s, index) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              className="bg-white rounded-lg shadow p-4"
            >
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex justify-between items-start mb-3"
              >
                <div>
                  <h3 className="font-semibold text-lg">{s.courseCode}</h3>
                  <p className="text-gray-600 text-sm">{s.descriptiveTitle}</p>
                </div>
                <motion.div 
                  className="flex gap-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    onClick={() => handleEdit(s._id)}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(s._id)}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 gap-2 text-sm"
              >
                <div>
                  <span className="text-gray-500">Units:</span>
                  <span className="ml-1">{s.units}</span>
                </div>
                <div>
                  <span className="text-gray-500">Days:</span>
                  <span className="ml-1">{s.days}</span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-1">{s.time}</span>
                </div>
                <div>
                  <span className="text-gray-500">Room:</span>
                  <span className="ml-1">{s.room}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Instructor:</span>
                  <span className="ml-1">{s.instructor}</span>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <motion.table 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-w-full border border-gray-300"
        >
          <motion.thead 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-100"
          >
            <tr>
              <th className="border p-2 text-left">Course Code</th>
              <th className="border p-2 text-left">Descriptive Title</th>
              <th className="border p-2 text-center">Units</th>
              <th className="border p-2 text-center">Days</th>
              <th className="border p-2 text-center">Time</th>
              <th className="border p-2 text-center">Room</th>
              <th className="border p-2 text-left">Instructor</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </motion.thead>
          <tbody>
            <AnimatePresence>
              {schedules.map((s, index) => (
                <motion.tr
                  key={s._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="border p-2">{s.courseCode}</td>
                  <td className="border p-2">{s.descriptiveTitle}</td>
                  <td className="border p-2 text-center">{s.units}</td>
                  <td className="border p-2 text-center">{s.days}</td>
                  <td className="border p-2 text-center">{s.time}</td>
                  <td className="border p-2 text-center">{s.room}</td>
                  <td className="border p-2">{s.instructor}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(s._id)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(s._id)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </motion.table>
      </div>

      {/* Edit Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCancelEdit}>
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
                    Edit Schedule
                  </Dialog.Title>
                  <div className="mt-2 space-y-4">
                    <div>
                      <input
                        name="courseCode"
                        value={editForm?.courseCode || ''}
                        onChange={handleEditChange}
                        placeholder="Course Code"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <input
                        name="descriptiveTitle"
                        value={editForm?.descriptiveTitle || ''}
                        onChange={handleEditChange}
                        placeholder="Descriptive Title"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <input
                        name="units"
                        value={editForm?.units || ''}
                        onChange={handleEditChange}
                        placeholder="Units"
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <input
                        name="days"
                        value={editForm?.days || ''}
                        onChange={handleEditChange}
                        placeholder="Days"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="space-y-2">
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
                    </div>
                    <div className="space-y-2">
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
                    </div>
                    <div>
                      <input
                        name="room"
                        value={editForm?.room || ''}
                        onChange={handleEditChange}
                        placeholder="Room"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <input
                        name="instructor"
                        value={editForm?.instructor || ''}
                        onChange={handleEditChange}
                        placeholder="Instructor"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSaveEdit}
                    >
                      {isSaving ? 'Please wait...' : 'Save Changes'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
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
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Confirm Delete
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this schedule? This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 cursor-pointer"
                      onClick={() => deleteId && handleDelete(deleteId)}
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
  