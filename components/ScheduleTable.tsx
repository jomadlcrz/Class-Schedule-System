import { useState, useEffect, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import debounce from 'lodash/debounce';

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

type SortField = 'courseCode' | 'descriptiveTitle' | 'units' | 'days' | 'time' | 'room' | 'instructor';
type SortDirection = 'asc' | 'desc';

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

function parseTimeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
  return totalMinutes;
}

export default function ScheduleTable({ 
  schedules, 
  onChange,
  sortField,
  sortDirection,
  onSort
}: { 
  schedules: Schedule[], 
  onChange: (callback: (prev: Schedule[]) => Schedule[]) => void,
  sortField: SortField,
  sortDirection: SortDirection,
  onSort: (field: SortField) => void
}) {
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
  const [validationErrors, setValidationErrors] = useState<{ courseCode?: string; descriptiveTitle?: string }>({});

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
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(time);
        return endMinutes > startMinutes;
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
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(time);
        return endMinutes > startMinutes;
      });

  function parseTime(timeString: string): { start: string | null; end: string | null } {
    const [start, end] = timeString.split('-');
    return { start: start || null, end: end || null };
  }

  const sortedSchedules = [...schedules].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortField === 'units') {
      const aNum = parseInt(aValue);
      const bNum = parseInt(bValue);
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    if (sortField === 'time') {
      const [aStart] = aValue.split('-');
      const [bStart] = bValue.split('-');
      const aMinutes = parseTimeToMinutes(aStart);
      const bMinutes = parseTimeToMinutes(bStart);
      return sortDirection === 'asc' ? aMinutes - bMinutes : bMinutes - aMinutes;
    }
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return null;
    return (
      <ChevronUpDownIcon 
        className={`w-4 h-4 ml-1 inline-block ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
      />
    );
  };

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

    // Find the original schedule
    const originalSchedule = schedules.find(s => s._id === editingId);
    if (!originalSchedule) {
      setError('Schedule not found');
      setIsSaving(false);
      return;
    }

    // Check if there are any changes
    const hasChanges = 
      originalSchedule.courseCode !== editForm.courseCode ||
      originalSchedule.descriptiveTitle !== editForm.descriptiveTitle ||
      originalSchedule.units !== editForm.units ||
      originalSchedule.days !== editForm.days ||
      originalSchedule.room !== editForm.room ||
      originalSchedule.instructor !== editForm.instructor ||
      originalSchedule.time !== `${startTime}-${endTime}`;

    if (!hasChanges) {
      setIsEditModalOpen(false);
      setEditingId(null);
      setEditForm(null);
      setStartTime(null);
      setEndTime(null);
      setIsSaving(false);
      return;
    }

    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      setIsSaving(false);
      return;
    }

    // Check for duplicates, excluding the current schedule being edited
    try {
      const checkRes = await fetch('/api/schedule/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: editForm.courseCode,
          descriptiveTitle: editForm.descriptiveTitle,
          excludeId: editingId // Exclude current schedule from duplicate check
        }),
      });

      const { isDuplicate, field } = await checkRes.json();
      
      if (isDuplicate) {
        setError(`${field} already exists. Please use a different ${field.toLowerCase()}.`);
        setIsSaving(false);
        return;
      }

      const timeString = `${startTime}-${endTime}`;

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

  function hasEditChanges() {
    if (!editForm || !editingId) return false;
    
    const originalSchedule = schedules.find(s => s._id === editingId);
    if (!originalSchedule) return false;

    return (
      originalSchedule.courseCode !== editForm.courseCode ||
      originalSchedule.descriptiveTitle !== editForm.descriptiveTitle ||
      originalSchedule.units !== editForm.units ||
      originalSchedule.days !== editForm.days ||
      originalSchedule.room !== editForm.room ||
      originalSchedule.instructor !== editForm.instructor ||
      originalSchedule.time !== `${startTime}-${endTime}`
    );
  }

  function handleCancelEdit() {
    if (hasEditChanges()) {
      // Don't close if there are changes
      return;
    }
    setIsEditModalOpen(false);
    setEditingId(null);
    setEditForm(null);
    setStartTime(null);
    setEndTime(null);
  }

  function handleForceClose() {
    setIsEditModalOpen(false);
    setEditingId(null);
    setEditForm(null);
    setStartTime(null);
    setEndTime(null);
  }

  const checkDuplicate = useCallback(
    debounce(async (field: 'courseCode' | 'descriptiveTitle', value: string) => {
      if (!value.trim() || !editingId) return;

      try {
        const checkRes = await fetch('/api/schedule/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [field]: value,
            excludeId: editingId
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
    }, 500),
    [editingId]
  );

  useEffect(() => {
    if (editForm?.courseCode) {
      checkDuplicate('courseCode', editForm.courseCode);
    }
  }, [editForm?.courseCode, checkDuplicate]);

  useEffect(() => {
    if (editForm?.descriptiveTitle) {
      checkDuplicate('descriptiveTitle', editForm.descriptiveTitle);
    }
  }, [editForm?.descriptiveTitle, checkDuplicate]);

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editForm) return;
    const { name, value } = e.target;
    
    // Clear error when input changes
    setError('');
    
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
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {sortedSchedules.map((s, index) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.05,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
              className="bg-white rounded-lg shadow p-4"
            >
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2 }}
                className="flex justify-between items-start mb-3"
              >
                <div>
                  <h3 className="font-semibold text-lg">{s.courseCode}</h3>
                  <p className="text-gray-600 text-sm">{s.descriptiveTitle}</p>
                </div>
                <motion.div 
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => handleEdit(s._id)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(s._id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
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
                transition={{ duration: 0.2 }}
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
              <th 
                className="border p-2 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('courseCode')}
              >
                Course Code <SortIcon field="courseCode" />
              </th>
              <th 
                className="border p-2 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('descriptiveTitle')}
              >
                Descriptive Title <SortIcon field="descriptiveTitle" />
              </th>
              <th 
                className="border p-2 text-center cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('units')}
              >
                Units <SortIcon field="units" />
              </th>
              <th 
                className="border p-2 text-center cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('days')}
              >
                Days <SortIcon field="days" />
              </th>
              <th 
                className="border p-2 text-center cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('time')}
              >
                Time <SortIcon field="time" />
              </th>
              <th 
                className="border p-2 text-center cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('room')}
              >
                Room <SortIcon field="room" />
              </th>
              <th 
                className="border p-2 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('instructor')}
              >
                Instructor <SortIcon field="instructor" />
              </th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </motion.thead>
          <tbody>
            <AnimatePresence>
              {sortedSchedules.map((s, index) => (
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
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(s._id)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(s._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
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
        <Dialog 
          as="div" 
          className="relative z-10" 
          onClose={handleCancelEdit}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                  <button
                    onClick={handleForceClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4 pr-8"
                  >
                    Edit Schedule
                  </Dialog.Title>
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
                  <div className="mt-2 space-y-4">
                    <div>
                      <input
                        name="courseCode"
                        value={editForm?.courseCode || ''}
                        onChange={handleEditChange}
                        placeholder="Course Code"
                        className={`w-full p-2 border rounded ${validationErrors.courseCode ? 'border-red-500' : ''}`}
                      />
                      {validationErrors.courseCode && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {validationErrors.courseCode}
                        </motion.p>
                      )}
                    </div>
                    <div>
                      <input
                        name="descriptiveTitle"
                        value={editForm?.descriptiveTitle || ''}
                        onChange={handleEditChange}
                        placeholder="Descriptive Title"
                        className={`w-full p-2 border rounded ${validationErrors.descriptiveTitle ? 'border-red-500' : ''}`}
                      />
                      {validationErrors.descriptiveTitle && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {validationErrors.descriptiveTitle}
                        </motion.p>
                      )}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <div className="flex flex-row items-center gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <Combobox value={startTime} onChange={(value) => {
                            setStartTime(value);
                            setEndTime(null);
                            setEndTimeQuery('');
                          }}>
                            <div className="relative">
                              <Combobox.Button className="w-full p-2 border rounded flex justify-between items-center bg-white h-[42px]">
                                <span className={(startTime ? '' : 'text-gray-400 text-xs') + ' truncate'}>
                                  {startTime || 'Select start time'}
                                </span>
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" aria-hidden="true" />
                              </Combobox.Button>
                              <Combobox.Options className="absolute z-10 bottom-full mb-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                        <span className="text-gray-400 flex-shrink-0">-</span>
                        <div className="flex-1 min-w-0">
                          <Combobox value={endTime} onChange={setEndTime} disabled={!startTime}>
                            <div className="relative">
                              <Combobox.Button className={`w-full p-2 border rounded flex justify-between items-center ${!startTime ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} h-[42px]`} disabled={!startTime}>
                                <span className={(!startTime ? 'text-gray-400 text-xs' : endTime ? '' : 'text-gray-400 text-xs') + ' truncate'}>
                                  {startTime ? (endTime || 'Select end time') : 'Select start time first'}
                                </span>
                                <ChevronUpDownIcon className={`h-5 w-5 ml-2 flex-shrink-0 ${!startTime ? 'text-gray-300' : 'text-gray-400'}`} aria-hidden="true" />
                              </Combobox.Button>
                              <Combobox.Options className="absolute z-10 bottom-full mb-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                      </div>
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

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                      onClick={handleSaveEdit}
                    >
                      {isSaving ? (
                        <>
                          Please wait...
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </>
                      ) : 'Save Changes'}
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