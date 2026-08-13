import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, Moon, Frame, Upload, RefreshCw, Download, 
  Share2, AlertCircle, CheckCircle2, ShieldCheck, 
  Sparkles, Image as ImageIcon, ZoomIn, Move
} from 'lucide-react';

export default function App() {
  // State Tema
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  // State File & Gambar
  const [frameImg, setFrameImg] = useState(null);
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const [userImg, setUserImg] = useState(null);

  // State Alert
  const [alert, setAlert] = useState({ type: '', message: '' });

  // State Kontrol Canvas (Transformasi Gambar)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Reference
  const canvasRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, dist: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });
  const scaleStartRef = useRef(1);

  // Toggle Mode Gelap / Terang Anti-Flicker
  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  // --- Verifikasi Transparansi Bingkai ---
  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      setAlert({ type: 'error', message: 'Format bingkai harus bertipe PNG transparan!' });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      // Periksa Alpha Channel dengan canvas sementara
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      let hasAlpha = false;

      // Sampel pixel untuk mendeteksi pixel transparan (alpha < 255)
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 255) {
          hasAlpha = true;
          break;
        }
      }

      if (!hasAlpha) {
        setAlert({ 
          type: 'error', 
          message: 'Gagal! Bingkai tidak memiliki bidang transparan (Alpha Pixel). Pastikan memakai PNG transparan.' 
        });
        URL.revokeObjectURL(url);
      } else {
        setFrameImg(img);
        setFrameDimensions({ width: img.width, height: img.height });
        setAlert({ type: 'success', message: 'Bingkai transparan valid dan berhasil diunggah!' });
      }
    };
  };

  // --- Upload Gambar Pengguna ---
  const handleUserImgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      setUserImg(img);
      // Reset skala & posisi pas di tengah
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsLocked(false);
    };
  };

  // --- Draw Canvas ---
  useEffect(() => {
    if (!canvasRef.current || !frameImg) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Gunakan resolusi dari bingkai asli
    canvas.width = frameDimensions.width || 1080;
    canvas.height = frameDimensions.height || 1080;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gambar foto user di paling bawah jika ada
    if (userImg) {
      ctx.save();
      ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
      ctx.scale(scale, scale);

      // Hitung rasio fit center awal
      const aspect = userImg.width / userImg.height;
      let drawW = canvas.width;
      let drawH = canvas.width / aspect;

      if (drawH < canvas.height) {
        drawH = canvas.height;
        drawW = canvas.height * aspect;
      }

      ctx.drawImage(userImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 2. Gambar bingkai di atas foto
    ctx.save();
    // Efek transparansi saat pengguna menggeser/zoom gambar (agar pas)
    if (isInteracting && !isLocked) {
      ctx.globalAlpha = 0.65;
    } else {
      ctx.globalAlpha = 1.0;
    }
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

  }, [frameImg, userImg, position, scale, isInteracting, frameDimensions, isLocked]);

  // --- Fitur Interaksi Touch/Mouse (Geser & Zoom 2 Jari) ---
  const getDistance = (t1, t2) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handlePointerDown = (e) => {
    if (isLocked || !userImg) return;
    setIsInteracting(true);

    if (e.touches && e.touches.length === 2) {
      // Multi touch (Zoom)
      const dist = getDistance(e.touches[0], e.touches[1]);
      touchStartRef.current.dist = dist;
      scaleStartRef.current = scale;
    } else {
      // Single touch / Mouse (Pan)
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      touchStartRef.current.x = clientX;
      touchStartRef.current.y = clientY;
      posStartRef.current = { ...position };
    }
  };

  const handlePointerMove = (e) => {
    if (!isInteracting || isLocked || !userImg) return;

    if (e.touches && e.touches.length === 2) {
      // Zooming
      const dist = getDistance(e.touches[0], e.touches[1]);
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        const newScale = Math.min(Math.max(scaleStartRef.current * factor, 0.2), 5);
        setScale(newScale);
      }
    } else {
      // Dragging / Panning
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - touchStartRef.current.x;
      const dy = clientY - touchStartRef.current.y;

      // Menyesuaikan rasio pergerakan berdasarkan ukuran tampilan canvas
      const canvasEl = canvasRef.current;
      const rect = canvasEl.getBoundingClientRect();
      const factor = canvasEl.width / rect.width;

      setPosition({
        x: posStartRef.current.x + dx * factor,
        y: posStartRef.current.y + dy * factor
      });
    }
  };

  const handlePointerEnd = () => {
    setIsInteracting(false);
  };

  // Zoom via Mouse Wheel
  const handleWheel = (e) => {
    if (isLocked || !userImg) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prevScale) => Math.min(Math.max(prevScale * zoomFactor, 0.2), 5));
  };

  // --- Buat & Unduh Twibbon ---
  const handleProcessTwibbon = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsLocked(true); // Kunci canvas
    }, 1200);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Twibbon_BINGKAI_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], 'twibbon.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Twibbon Saya',
            text: 'Lihat twibbon keren yang saya buat di BINGKAI!',
            files: [file],
          });
        } catch (error) {
          console.error('Batal berbagi:', error);
        }
      } else {
        alert('Fitur Web Share API tidak didukung pada peramban ini. Anda dapat mengunduhnya secara langsung.');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* 1. NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-600 rounded-xl text-white shadow-md">
              <Frame className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-wider bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              BINGKAI
            </span>
          </div>
          <button 
            onClick={toggleTheme}
            aria-label="Toggle Mode"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-grow w-full">
        
        {/* 2. ARTIKEL SINGKAT INTRO SETELAH NAVBAR */}
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-gray-900 dark:text-white">
            Solusi Pasang Twibbon Instan Tanpa Ribet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
            BINGKAI memudahkan Anda menggabungkan foto pribadi ke dalam bingkai kampanye, acara, atau kegiatan komunitas secara cepat, presisi, dan menjaga kualitas foto tetap tinggi.
          </p>
        </header>

        {/* 3. ALUR WORKFLOW & CONTENT CONTAINER */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-5 sm:p-8 mb-12">
          
          {/* A. ALERT SYSTEM VERIFIKASI BINGKAI */}
          {alert.message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
              alert.type === 'error' 
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900' 
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {alert.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
              <span>{alert.message}</span>
            </div>
          )}

          {/* A. DROP AREA BINGKAI (Tampil saat belum ada bingkai) */}
          {!frameImg && (
            <div className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 text-left">
                Langkah 1: Unggah Bingkai (PNG Transparan)
              </h2>
              <div className="relative aspect-square w-full max-w-sm mx-auto border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/50 transition-all group">
                <input 
                  type="file" 
                  accept="image/png" 
                  onChange={handleFrameUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-4 rounded-full bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Tarik & Lepas Bingkai di Sini
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format PNG Wajib Transparan (1:1 Disarankan)
                </p>
              </div>
            </div>
          )}

          {/* B & C. PREVIEW BINGKAI & UPLOAD FOTO PENGGUNA */}
          {frameImg && !userImg && (
            <div className="space-y-6">
              
              {/* Point B: Preview Bingkai + Resolusi + Tombol Ganti */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-700">
                {/* Preview Thumbnail Kiri */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600 bg-checkered flex-shrink-0">
                  <img src={frameImg.src} alt="Preview Bingkai" className="w-full h-full object-contain" />
                </div>

                {/* Sebelah Kanan: Dimensi (Atas) & Tombol Ganti Bingkai Kecil (Bawah) */}
                <div className="flex flex-col items-start gap-2 min-w-0">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Dimensi Asli Bingkai:</p>
                    <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 truncate">
                      {frameDimensions.width} × {frameDimensions.height} px
                    </p>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors active:scale-95">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti Bingkai</span>
                    <input type="file" accept="image/png" onChange={handleFrameUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Point C: Langkah Kedua Upload Foto Pengguna */}
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 text-left">
                  Langkah Kedua: Unggah Foto Kamu
                </h2>
                <div className="relative aspect-square w-full max-w-sm mx-auto border-2 border-dashed border-brand-300 dark:border-brand-800 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-brand-50/20 dark:bg-slate-800/80 transition-all group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUserImgUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-4 rounded-full bg-brand-100 dark:bg-slate-700 text-brand-600 dark:text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Unggah Foto Yang Ingin Dipasang
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mendukung JPG, PNG, WEBP
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* D, E, F. CANVAS EDITOR & KONTROL */}
          {frameImg && userImg && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 text-left">
                Sesuaikan Posisi Foto
              </h2>

              <div className="flex flex-col items-center">
                
                {/* Petunjuk Gesture */}
                {!isLocked && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5" /> Geser foto</span>
                    <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5" /> Pinch/Wheel untuk Zoom</span>
                  </div>
                )}

                {/* Canvas Gambar + Transparansi otomatis saat diinteraksi */}
                <div 
                  className={`relative aspect-square w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg bg-checkered border border-gray-200 dark:border-slate-700 touch-none ${
                    isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                  }`}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerEnd}
                  onMouseLeave={handlePointerEnd}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerEnd}
                  onWheel={handleWheel}
                >
                  <canvas ref={canvasRef} className="w-full h-full object-contain block" />
                </div>

                {/* Tombol Aksi */}
                <div className="mt-6 w-full max-w-md flex flex-col gap-3">
                  
                  {/* Point E: Tombol Buat Twibbon dengan animasi Memproses... */}
                  {!isLocked && (
                    <button
                      onClick={handleProcessTwibbon}
                      disabled={isProcessing}
                      className="w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Buat Twibbon</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Point F: Tombol Unduh & Bagikan + Edit Lagi (Canvas Terkunci) */}
                  {isLocked && (
                    <div className="space-y-3 w-full">
                      <button
                        onClick={handleDownload}
                        className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>Unduh Twibbon</span>
                      </button>

                      <div className="flex gap-3">
                        <button
                          onClick={handleShare}
                          className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Bagikan</span>
                        </button>

                        <button
                          onClick={() => setIsLocked(false)}
                          className="py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Edit Lagi</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* G. CATATAN PRIVASI (A - G) */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/60 flex items-start gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Jaminan Privasi:</strong> Foto & bingkai diproses sepenuhnya di browser kamu secara lokal, tidak pernah diunggah atau disimpan ke server mana pun. Privasi kamu 100% aman.
            </p>
          </div>

        </section>

        {/* H. ARTIKEL LENGKAP AJAKAN */}
        <article className="prose dark:prose-invert max-w-none bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-sm text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Mengapa Harus Menggunakan BINGKAI?
          </h2>
          <p className="mb-4">
            Di era digital saat ini, twibbon menjadi media yang sangat efektif untuk mengampanyekan gerakan, merayakan momen penting, hingga meningkatkan kesadaran suatu acara. **BINGKAI** hadir untuk memberikan pengalaman pembuatan twibbon yang instan, mudah, dan profesional.
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li><strong>Tanpa Registrasi:</strong> Langsung pakai tanpa perlu membuat akun atau login.</li>
            <li><strong>Presisi Tinggi:</strong> Dilengkapi fitur geser dan zoom intuitif untuk menyesuaikan posisi foto secara sempurna.</li>
            <li><strong>Kualitas Asli Terjaga:</strong> Mempertahankan resolusi bingkai asli tanpa kompresi berlebih.</li>
            <li><strong>100% Aman & Cepat:</strong> Proses render instant menggunakan teknologi HTML5 Canvas langsung di perangkat Anda.</li>
          </ul>
        </article>

      </main>

      {/* I. FOOTER (Tahun Otomatis) */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-gray-500 dark:text-gray-400 transition-colors">
        <div className="max-w-4xl mx-auto px-4">
          <p>© {new Date().getFullYear()} BINGKAI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
