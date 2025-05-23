import { useState, useEffect } from 'react';
import { PencilSquareIcon, TrashIcon, ChevronUpDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import debounce from 'lodash/debounce';
import { Schedule, SortField, SortDirection } from '@/types/schedule';
import { generateTimeOptions, parseTimeToMinutes } from '@/utils/time';

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
  const [validationErrors, setValidationErrors] = useState<{
    courseCode?: string;
    descriptiveTitle?: string;
  }>({});
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
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
      })
    : timeOptions.filter((time) => {
        if (!time.toLowerCase().includes(endTimeQuery.toLowerCase())) return false;
        if (!startTime) return true;
        return parseTimeToMinutes(time) > parseTimeToMinutes(startTime);
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
        setValidationErrors(prev => ({
          ...prev,
          [field.toLowerCase()]: `${field} already exists. Please use a different ${field.toLowerCase()}.`
        }));
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

  // Debounced validation function
  const validateField = debounce(async (field: 'courseCode' | 'descriptiveTitle', value: string) => {
    if (!value || !editingId) return;

    try {
      const checkRes = await fetch('/api/schedule/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value,
          excludeId: editingId // Exclude current schedule from duplicate check
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
    if (!isEditModalOpen) {
      setValidationErrors({});
    }
  }, [isEditModalOpen]);

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
                    className="p-2 text-gray-500 rounded-full transition-colors cursor-pointer enable-mobile-hover hover:bg-gray-100 hover:text-blue-600"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(s._id)}
                    className="p-2 text-gray-500 rounded-full transition-colors cursor-pointer enable-mobile-hover hover:bg-gray-100 hover:text-red-600"
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
                className="border p-2 text-left cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('courseCode')}
              >
                <div className="flex items-center text-gray-500 hover:text-gray-700">
                  Course Code 
                  <SortIcon field="courseCode" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'courseCode' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-left cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('descriptiveTitle')}
              >
                <div className="flex items-center text-gray-500 hover:text-gray-700">
                  Descriptive Title 
                  <SortIcon field="descriptiveTitle" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'descriptiveTitle' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-center cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('units')}
              >
                <div className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                  Units 
                  <SortIcon field="units" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'units' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-center cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('days')}
              >
                <div className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                  Days 
                  <SortIcon field="days" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'days' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-center cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('time')}
              >
                <div className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                  Time 
                  <SortIcon field="time" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'time' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-center cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('room')}
              >
                <div className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                  Room 
                  <SortIcon field="room" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'room' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th 
                className="border p-2 text-left cursor-pointer transition-all duration-200 hover:bg-gray-100 group"
                onClick={() => onSort('instructor')}
              >
                <div className="flex items-center text-gray-500 hover:text-gray-700">
                  Instructor 
                  <SortIcon field="instructor" />
                  <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {sortField === 'instructor' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </div>
              </th>
              <th className="border p-2 text-center">Actions</th>
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
                  className="enable-mobile-hover hover:bg-gray-50"
                >
                  <td className="border p-2">{s.courseCode}</td>
                  <td className="border p-2">{s.descriptiveTitle}</td>
                  <td className="border p-2 text-center">{s.units}</td>
                  <td className="border p-2 text-center">{s.days}</td>
                  <td className="border p-2 text-center">{s.time}</td>
                  <td className="border p-2 text-center">{s.room}</td>
                  <td className="border p-2">{s.instructor}</td>
                  <td className="border p-2 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleEdit(s._id)}
                        className="p-2 text-gray-500 rounded-full transition-colors cursor-pointer enable-mobile-hover hover:bg-gray-100 hover:text-blue-600"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(s._id)}
                        className="p-2 text-gray-500 rounded-full transition-colors cursor-pointer enable-mobile-hover hover:bg-gray-100 hover:text-red-600"
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
                    onClick={handleForceClose}
                    className="absolute top-4 right-4 text-gray-400 enable-mobile-hover hover:text-gray-600 focus:outline-none transition-colors"
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
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSaveEdit();
                    }}
                  >
                    <div className="mt-2 space-y-4">
                      <div>
                        <input
                          name="courseCode"
                          value={editForm?.courseCode || ''}
                          onChange={handleEditChange}
                          placeholder="Course Code"
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200 ${validationErrors.courseCode ? 'border-red-500' : ''}`}
                          required
                        />
                        {validationErrors.courseCode && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.courseCode}</p>
                        )}
                      </div>
                      <div>
                        <input
                          name="descriptiveTitle"
                          value={editForm?.descriptiveTitle || ''}
                          onChange={handleEditChange}
                          placeholder="Descriptive Title"
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200 ${validationErrors.descriptiveTitle ? 'border-red-500' : ''}`}
                          required
                        />
                        {validationErrors.descriptiveTitle && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.descriptiveTitle}</p>
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
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <input
                          name="days"
                          value={editForm?.days || ''}
                          onChange={handleEditChange}
                          placeholder="Days"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                          required
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
                          value={editForm?.room || ''}
                          onChange={handleEditChange}
                          placeholder="Room"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <input
                          name="instructor"
                          value={editForm?.instructor || ''}
                          onChange={handleEditChange}
                          placeholder="Instructor"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 enable-mobile-hover hover:opacity-80 transition-all"
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
                  </form>
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
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 enable-mobile-hover hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer transition-all duration-200"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white enable-mobile-hover hover:opacity-80 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 cursor-pointer transition-all duration-200"
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