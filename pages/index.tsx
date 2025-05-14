import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import ScheduleForm from "../components/ScheduleForm";
import ScheduleTable from "../components/ScheduleTable";
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { EnvelopeIcon, ArrowRightOnRectangleIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Schedule, SortField, SortDirection } from '../types';

export default function Home() {
  const { data: session, status } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sortField');
      return (saved as SortField) || 'courseCode';
    }
    return 'courseCode';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sortDirection');
      return (saved as SortDirection) || 'asc';
    }
    return 'asc';
  });
  const [isSortOpen, setIsSortOpen] = useState(false);
  const router = useRouter();



  useEffect(() => {
    if (status === 'authenticated') {
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
  }, [status, session]);

  // Save sort preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sortField', sortField);
      localStorage.setItem('sortDirection', sortDirection);
    }
  }, [sortField, sortDirection]);

  function handleSchedulesChange(callback: (prev: Schedule[]) => Schedule[]) {
    setSchedules(callback);
  }

  const sortOptions = [
    { label: 'Course Code', value: 'courseCode' },
    { label: 'Descriptive Title', value: 'descriptiveTitle' },
    { label: 'Units', value: 'units' },
    { label: 'Days', value: 'days' },
    { label: 'Time', value: 'time' },
    { label: 'Room', value: 'room' },
    { label: 'Instructor', value: 'instructor' },
  ];

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (status === 'loading') {
    return null;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-lg shadow-md text-center"
        >
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Image
              src="/logo.png"
              alt="Class Schedule Logo"
              width={150}
              height={150}
              className="mx-auto"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </motion.div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold mb-6"
          >
            Welcome to Class Schedule
          </motion.h1>
          <motion.p 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            Please sign in to manage your class schedule
          </motion.p>
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <button
              onClick={() => signIn("google")}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Image
                src="/google.svg"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              Sign in with Google
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-3 md:hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Image
              src="/logo.png"
              alt="Class Schedule Logo"
              width={56}
              height={56}
              className="rounded-lg"
              priority
            />
            <h1 className="text-xl font-semibold">Class Schedule</h1>
          </button>
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="inline-flex w-full justify-center items-center rounded-full cursor-pointer focus:outline-none md:hover:ring-2 md:hover:ring-gray-300 transition-all">
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
                      <div className="px-4 py-2 text-sm text-gray-700 flex items-center gap-2 enable-mobile-hover hover:bg-gray-100 transition-colors">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <span>{session.user?.email}</span>
                      </div>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm cursor-pointer text-gray-700 enable-mobile-hover hover:bg-gray-100 enable-mobile-hover hover:text-gray-900 transition-colors"
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
      </header>

      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-7xl mx-auto px-4 py-8"
      >
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ 
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
            className="md:col-span-3"
          >
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Your Schedule</h2>
                    <Menu as="div" className="relative">
                      <Menu.Button 
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 rounded-full transition-all duration-200 ${
                          isSortOpen ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-100 hover:text-gray-700'
                        }`}
                        onClick={() => setIsSortOpen(true)}
                      >
                        Sort by: {sortOptions.find(opt => opt.value === sortField)?.label}
                        <ChevronUpDownIcon className="w-4 h-4 transition-transform duration-200" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                        afterLeave={() => setIsSortOpen(false)}
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            {sortOptions.map((option) => (
                              <Menu.Item key={option.value}>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleSort(option.value as SortField)}
                                    className={`${
                                      sortField === option.value ? 'text-blue-600' : 'text-gray-700'
                                    } flex w-full items-center px-4 py-2 text-sm enable-mobile-hover hover:bg-gray-100 transition-colors`}
                                  >
                                    {option.label}
                                    {sortField === option.value && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        ({sortDirection === 'asc' ? '↑' : '↓'})
                                      </span>
                                    )}
                                  </button>
                                )}
                              </Menu.Item>
                            ))}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  <div className="w-full">
                    <ScheduleForm onAdded={handleSchedulesChange} />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <ScheduleTable 
                  schedules={schedules} 
                  onChange={handleSchedulesChange}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  );
}
