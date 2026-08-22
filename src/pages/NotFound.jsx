import React, { useState, useEffect } from 'react';
import { Home, Circle, ArrowLeft, Sun, Moon } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col justify-between font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100">
      {/* NAVBAR SIMPEL */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-[600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a 
            href="/"
            className="flex items-center space-x-2 group decoration-0"
            title="TWIBBONK - Beranda"
          >
            <Circle className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:rotate-12" />
            <span className="text-lg font-black tracking-wider text-blue-600 dark:text-blue-400">
              TWIBBONK
            </span>
          </a>

          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95"
            aria-label="Toggle Mode Gelap/Terang"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* KONTEN UTAMA 404 */}
      <main className="max-w-[600px] mx-auto px-4 sm:px-6 py-12 flex-grow w-full flex flex-col items-center justify-center text-center">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-gray-100 dark:border-slate-700 p-8 sm:p-10 w-full flex flex-col items-center">
          
          {/* VISUAL BADGE 404 */}
          <div className="relative mb-6 flex items-center justify-center">
            <span className="text-7xl sm:text-8xl font-black text-blue-100 dark:text-slate-700/60 select-none">
              404
            </span>
            <div className="absolute p-4 rounded-2xl bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-600">
              <Circle className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          {/* TEKS INFORMASI */}
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3 text-gray-900 dark:text-white tracking-tight">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mb-8">
            Maaf, halaman yang kamu cari tidak ada, telah dihapus, atau alamat URL yang dimasukkan salah.
          </p>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <a
              href="/"
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer decoration-0"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </a>
            
            <button
              onClick={() => window.history.back()}
              className="w-full h-11 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-[0.98] text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Halaman Sebelumnya</span>
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-[600px] mx-auto px-4">
          <p>
            © {new Date().getFullYear()}{' '}
            <a href="/" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              TWIBBONK
            </a>
            . All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
