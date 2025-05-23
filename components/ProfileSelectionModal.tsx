import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';

const programs = [
  'BS Criminology',
  'BS Information Technology',
  'BS Computer Science',
  '2-Year Associate in Computer Science',
  'BS Business Administration',
  'Major in Marketing Management',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Senior High School - ABM',
  'Senior High School - HUMSS',
  'Senior High School - STEM',
  'Senior High School - TVL',
  'Special Program: Professional Education Unit Earner',
];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const semesters = ['1st Semester', '2nd Semester'];
const academicYears = ['2024-2025', '2025-2026', '2026-2027'];

function Select({ label, value, onChange, options, required }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="mb-4">
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Label className="block mb-1 font-medium text-gray-700">
            {label}
          </Listbox.Label>
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-4 pr-10 text-left border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-all duration-200">
            <span className={`block truncate ${value ? 'text-gray-700' : 'text-gray-400'}`}>
              {value || `Select ${label}`}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.map((option) => (
                <Listbox.Option
                  key={option}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2.5 pl-10 pr-4 ${
                      active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`
                  }
                  value={option}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}

export default function ProfileSelectionModal() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Store initial values for comparison
  const [initialValues, setInitialValues] = useState({
    program: '',
    year: '',
    semester: '',
    academicYear: ''
  });

  useEffect(() => {
    // Listen for the custom event to open the modal in edit mode
    const handleOpenModal = (event: CustomEvent) => {
      setIsEditMode(event.detail.isEditMode);
      setOpen(true);
    };

    window.addEventListener('openProfileModal', handleOpenModal as EventListener);
    return () => {
      window.removeEventListener('openProfileModal', handleOpenModal as EventListener);
    };
  }, []);

  useEffect(() => {
    // Don't show the modal on error pages
    if (router.pathname === '/404' || router.pathname === '/500') {
      setOpen(false);
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const { program, year, semester, academicYear } = session.user as any;
      if (!program || !year || !semester || !academicYear) {
        setOpen(true);
        setIsEditMode(false);
      } else {
        setOpen(false);
        // Set initial values for edit mode
        setProgram(program);
        setYear(year);
        setSemester(semester);
        setAcademicYear(academicYear);
        // Store initial values for comparison
        setInitialValues({
          program,
          year,
          semester,
          academicYear
        });
      }
    }
  }, [session, status, router.pathname]);

  const hasChanges = () => {
    return program !== initialValues.program ||
           year !== initialValues.year ||
           semester !== initialValues.semester ||
           academicYear !== initialValues.academicYear;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !year || !semester || !academicYear) {
      setError('All fields are required.');
      return;
    }

    // Don't save if no changes were made
    if (isEditMode && !hasChanges()) {
      setOpen(false);
      setIsEditMode(false);
      return;
    }

    setLoading(true);
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program, year, semester, academicYear }),
    });
    if (res.ok) {
      await signIn(undefined, { redirect: false });
      setOpen(false);
      setIsEditMode(false);
    } else {
      setError('Failed to save profile.');
    }
    setLoading(false);
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-2xl font-bold mb-6 text-center">
                  {isEditMode ? 'Edit Profile' : 'Select Your Program'}
                </Dialog.Title>
                <form onSubmit={handleSubmit}>
                  <Select
                    label="Program"
                    value={program}
                    onChange={setProgram}
                    options={programs}
                    required
                  />
                  <Select
                    label="Year"
                    value={year}
                    onChange={setYear}
                    options={years}
                    required
                  />
                  <Select
                    label="Semester"
                    value={semester}
                    onChange={setSemester}
                    options={semesters}
                    required
                  />
                  <Select
                    label="Academic Year"
                    value={academicYear}
                    onChange={setAcademicYear}
                    options={academicYears}
                    required
                  />
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setIsEditMode(false);
                        }}
                        className="flex-1 bg-white text-gray-700 py-2.5 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className={`${isEditMode ? 'flex-1' : 'w-full'} bg-blue-600 text-white py-2.5 rounded-lg hover:opacity-80 hover:shadow-md active:bg-blue-800 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 