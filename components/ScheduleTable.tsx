import { useState } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

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

export default function ScheduleTable({ schedules, onChange }: { schedules: Schedule[], onChange: (callback: (prev: Schedule[]) => Schedule[]) => void }) {
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Schedule | null>(null);

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
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm) return;

    try {
      const res = await fetch(`/api/schedule/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update schedule');
      }

      // Update the UI with the server response
      onChange((prev) => {
        const newSchedules = prev.map(item => 
          item._id === editingId ? { ...item, ...data } : item
        );
        return newSchedules;
      });

      // Clear editing state after successful save
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editForm) return;
    const { name, value } = e.target;
    setEditForm(prev => prev ? { ...prev, [name]: value } : null);
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Course Code</th>
            <th className="border p-2 text-left">Descriptive Title</th>
            <th className="border p-2 text-left">Units</th>
            <th className="border p-2 text-left">Days</th>
            <th className="border p-2 text-left">Time</th>
            <th className="border p-2 text-left">Room</th>
            <th className="border p-2 text-left">Instructor</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s._id} className="hover:bg-gray-50">
              {editingId === s._id ? (
                <>
                  <td className="border p-2">
                    <input
                      name="courseCode"
                      value={editForm?.courseCode || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="descriptiveTitle"
                      value={editForm?.descriptiveTitle || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="units"
                      value={editForm?.units || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="days"
                      value={editForm?.days || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="time"
                      value={editForm?.time || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="room"
                      value={editForm?.room || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      name="instructor"
                      value={editForm?.instructor || ''}
                      onChange={handleEditChange}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-800"
                        title="Cancel"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="border p-2">{s.courseCode}</td>
                  <td className="border p-2">{s.descriptiveTitle}</td>
                  <td className="border p-2 text-center">{s.units}</td>
                  <td className="border p-2">{s.days}</td>
                  <td className="border p-2">{s.time}</td>
                  <td className="border p-2">{s.room}</td>
                  <td className="border p-2">{s.instructor}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(s._id)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s._id)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
  