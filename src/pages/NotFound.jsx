import React, { useState, useEffect } from 'react';
import { Home, Circle, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            to="/"
            className="flex items-center gap-2 group no-underline"
            title="TWIBBONK - Beranda"
          >
            <Circle className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-200" />
            <span className="text-lg font-black tracking-wider text-blue-600 dark:text-blue-400">
              TWIBBONK
            </span>
          </Link>

          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* KONTEN UTAMA */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-12 flex-grow w-full flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700/60 p-6 sm:p-10 w-full flex flex-col items-center text-center">
          
          {/* BADGE VISUAL 404 */}
          <div className="relative mb-6 flex items-center justify-center w-full">
            <span className="text-8xl sm:text-9xl font-black text-blue-100/80 dark:text-slate-700/50 select-none tracking-widest">
              404
            </span>
            <div className="absolute p-4 rounded-2xl bg-blue-50 dark:bg-slate-700/80 text-blue-600 dark:text-blue-400 shadow-md border border-blue-100 dark:border-slate-600 backdrop-blur-sm">
              <Circle className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          {/* JUDUL & DESKRIPSI */}
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3 text-gray-900 dark:text-white tracking-tight">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed max-w-md mb-8">
            Maaf, halaman yang kamu cari tidak ada, telah dihapus, atau alamat URL yang dimasukkan salah.
          </p>

          {/* TOMBOL AKSI (RESPONSIVE FLEX) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              to="/"
              className="w-full sm:w-auto min-w-[180px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap no-underline transition-all"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Kembali ke Beranda</span>
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto min-w-[180px] px-5 py-3 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700/60 active:scale-95 text-gray-700 dark:text-gray-200 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Halaman Sebelumnya</span>
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-4xl mx-auto px-4">
          <p>
            © {new Date().getFullYear()}{' '}
            <Link to="/" className="font-bold text-blue-600 dark:text-blue-400 hover:underline no-underline">
              TWIBBONK
            </Link>
            . All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
