"use client";

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

const animatedImages = [
  "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1073&q=80",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80",
  "https://images.unsplash.com/photo-1550439062-609e1531270e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
];

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === animatedImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
        <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-6xl min-h-[600px] bg-gray-800/50 border border-gray-700 shadow-2xl shadow-fuchsia-900/10 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-2"
      >
        <div className="hidden lg:block relative overflow-hidden">
            <AnimatePresence>
                <motion.img
                    key={currentImageIndex}
                    src={animatedImages[currentImageIndex]}
                    alt="Portfolio and blog creation showcase"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
            <div className="absolute bottom-8 left-8 text-white">
                    <Link href="/" className="text-3xl font-bold tracking-tight">
                        blog<span className="text-fuchsia-400">.io</span>
                    </Link>
                <p className="text-gray-300 mt-2">Showcase your work and share your story on a platform designed for creators.</p>
            </div>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12">
            <div className="w-full">
                <div className="text-center mb-8">
                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">{title}</h2>
                </div>
                {children}
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;