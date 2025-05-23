import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full mx-4"
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
            width={136}
            height={136}
            className="mx-auto"
            priority
          />
        </motion.div>
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-4"
        >
          Page Not Found
        </motion.h1>
        <motion.p 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6"
        >
          The page you're looking for doesn't exist or has been moved.
        </motion.p>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
} 