import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

export default function Login() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return null;
  }

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