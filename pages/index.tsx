import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import ScheduleForm from "../components/ScheduleForm";
import ScheduleTable from "../components/ScheduleTable";
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { EnvelopeIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

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

export default function Home() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user?.email) {
      async function fetchSchedules() {
        try {
          const res = await fetch(`/api/schedules?email=${session?.user?.email}`);
          if (!res.ok) {
            throw new Error('Failed to fetch schedules');
          }
          const data = await res.json();
          setSchedules(data);
        } catch (err) {
          console.error('Error fetching schedules:', err);
          setError('Failed to load schedules. Please refresh the page.');
        }
      }
      fetchSchedules();
    }
  }, [session]);

  function handleSchedulesChange(callback: (prev: Schedule[]) => Schedule[]) {
    setSchedules(callback);
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="mb-6">
            <Image
              src="/logo.png"
              alt="Class Schedule Logo"
              width={150}
              height={150}
              className="mx-auto"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold mb-6">Welcome to Class Schedule</h1>
          <p className="text-gray-600 mb-6">Please sign in to manage your class schedule</p>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Class Schedule</h1>
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="inline-flex w-full justify-center items-center rounded-full cursor-pointer outline-none md:hover:ring-2 md:hover:ring-gray-300 transition-all">
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user?.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">
                      {session.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </Menu.Button>
            </div>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <div className={`${
                        active ? 'bg-gray-100' : ''
                      } px-4 py-2 text-sm text-gray-700 flex items-center gap-2`}>
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <span>{session.user?.email}</span>
                      </div>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => signOut()}
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } flex w-full items-center gap-2 px-4 py-2 text-left text-sm cursor-pointer`}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Add New Schedule</h2>
              </div>
              <ScheduleForm onAdded={handleSchedulesChange} />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Your Schedule</h2>
              </div>
              <div className="p-4">
                <ScheduleTable schedules={schedules} onChange={handleSchedulesChange} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
