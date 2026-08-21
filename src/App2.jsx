import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, Moon, Circle, Upload, Settings2, Download, 
  Share2, AlertCircle, CheckCircle2, ShieldCheck, 
  Sparkles, Image as ImageIcon, ZoomIn, Move, Loader2,
  ChevronDown, Check
} from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [frameImg, setFrameImg] = useState(null);
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const [userImg, setUserImg] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const [isUploadingFrame, setIsUploadingFrame] = useState(false);
  const [isUploadingUserImg, setIsUploadingUserImg] = useState(false);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Opsi format unduhan & state dropdown
  const [downloadFormat, setDownloadFormat] = useState('png'); // 'png' atau 'jpg'
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const canvasRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, dist: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });
  const scaleStartRef = useRef(1);

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

  // Menutup dropdown saat klik di luar area tombol
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFormatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      setAlert({ type: 'error', message: 'Format bingkai harus bertipe PNG transparan!' });
      return;
    }

    setIsUploadingFrame(true);

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      setTimeout(() => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        let hasAlpha = false;

        for (let i = 3; i < data.length; i += 16) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }

        setIsUploadingFrame(false);

        if (!hasAlpha) {
          setAlert({ 
            type: 'error', 
            message: 'Bingkai transparan tidak valid! Pastikan memakai file PNG transparan.' 
          });
          URL.revokeObjectURL(url);
        } else {
          setFrameImg(img);
          setFrameDimensions({ width: img.width, height: img.height });
          setAlert({ type: 'success', message: 'Bingkai transparan berhasil diunggah! Silakan lanjut ke langkah kedua.' });
        }
      }, 600);
    };
  };

  const handleUserImgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlert({ type: 'error', message: 'File yang diunggah harus berupa gambar (JPG, PNG, WEBP)!' });
      return;
    }

    setIsUploadingUserImg(true);

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      setTimeout(() => {
        setUserImg(img);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsLocked(false);
        setIsUploadingUserImg(false);
        setAlert({ type: 'success', message: 'Foto berhasil diunggah! Atur posisi & zoom sesuai selera lalu klik "Buat Twibbon".' });
      }, 600);
    };
  };

  useEffect(() => {
    if (!canvasRef.current || !frameImg) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = frameDimensions.width || 1080;
    canvas.height = frameDimensions.height || 1080;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (userImg) {
      ctx.save();
      ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
      ctx.scale(scale, scale);

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

    ctx.save();
    if (isInteracting && !isLocked) {
      ctx.globalAlpha = 0.65;
    } else {
      ctx.globalAlpha = 1.0;
    }
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

  }, [frameImg, userImg, position, scale, isInteracting, frameDimensions, isLocked]);

  const getCanvasWithWatermark = () => {
    if (!canvasRef.current) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasRef.current.width;
    exportCanvas.height = canvasRef.current.height;
    const ctx = exportCanvas.getContext('2d');

    // Jika format unduh JPG, berikan latar belakang putih (karena JPG tak punya transparansi)
    if (downloadFormat === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.drawImage(canvasRef.current, 0, 0);

    const fontSize = Math.max(14, Math.round(exportCanvas.width * 0.022));
    const padding = Math.max(16, Math.round(exportCanvas.width * 0.025));

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('TWIBBONK.WEB.APP', exportCanvas.width - padding, exportCanvas.height - padding);
    ctx.restore();

    return exportCanvas;
  };

  const handlePointerDown = (e) => {
    if (isLocked || !userImg) return;
    setIsInteracting(true);

    if (e.touches && e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchStartRef.current.dist = dist;
      scaleStartRef.current = scale;
    } else {
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
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        setScale(Math.min(Math.max(scaleStartRef.current * factor, 0.2), 5));
      }
    } else {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - touchStartRef.current.x;
      const dy = clientY - touchStartRef.current.y;

      const canvasEl = canvasRef.current;
      const rect = canvasEl.getBoundingClientRect();
      const factor = canvasEl.width / rect.width;

      setPosition({
        x: posStartRef.current.x + dx * factor,
        y: posStartRef.current.y + dy * factor
      });
    }
  };

  const handlePointerEnd = () => setIsInteracting(false);

  const handleWheel = (e) => {
    if (isLocked || !userImg) return;
    e.preventDefault();
    setScale((prev) => Math.min(Math.max(prev * (e.deltaY < 0 ? 1.08 : 0.92), 0.2), 5));
  };

  const handleProcessTwibbon = () => {
    if (!userImg) {
      setAlert({ type: 'error', message: 'Harap unggah foto Anda terlebih dahulu sebelum memproses!' });
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsLocked(true);
      setAlert({ type: 'success', message: 'Twibbon selesai dibuat! Klik tombol "Unduh Twibbon" untuk mengunduh hasil gambar.' });
    }, 800);
  };

  const handleDownload = (selectedFormat = downloadFormat) => {
    if (isDownloading) return;
    
    setIsFormatMenuOpen(false);
    setIsDownloading(true);

    setTimeout(() => {
      const exportCanvas = getCanvasWithWatermark();
      if (!exportCanvas) {
        setIsDownloading(false);
        return;
      }

      const mimeType = selectedFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const extension = selectedFormat === 'jpg' ? 'jpg' : 'png';

      const link = document.createElement('a');
      link.download = `TWIBBONK.WEB.APP_${Date.now()}.${extension}`;
      link.href = exportCanvas.toDataURL(mimeType, 0.92);
      link.click();

      setIsDownloading(false);
      setAlert({ type: 'success', message: `Twibbon format ${selectedFormat.toUpperCase()} berhasil diunduh!` });
    }, 600);
  };

  const handleSelectFormat = (format) => {
    setDownloadFormat(format);
    setIsFormatMenuOpen(false);
    handleDownload(format);
  };

  const handleShare = async () => {
    const exportCanvas = getCanvasWithWatermark();
    if (!exportCanvas) return;

    exportCanvas.toBlob(async (blob) => {
      const file = new File([blob], 'twibbon.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Twibbon Saya',
            text: 'Lihat twibbon keren yang saya buat di TWIBBONK!',
            files: [file],
          });
          setAlert({ type: 'success', message: 'Menu berbagi berhasil dibuka!' });
        } catch (error) {
          if (error.name !== 'AbortError') {
            setAlert({ type: 'error', message: 'Gagal membagikan twibbon secara langsung.' });
          }
        }
      } else {
        setAlert({ type: 'error', message: 'Fitur berbagi tidak didukung di browser ini. Silakan unduh gambar secara langsung.' });
      }
    });
  };

  const handleReEdit = () => {
    setIsLocked(false);
    setAlert({ type: 'success', message: 'Mode edit diaktifkan. Silakan sesuaikan kembali posisi atau skala foto kamu.' });
  };

  const canvasAspectRatio = frameDimensions.width && frameDimensions.height 
    ? `${frameDimensions.width} / ${frameDimensions.height}` 
    : '1 / 1';

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-[600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          {/* LINK ANCHOR LOGO & BRAND */}
          <a 
            href="/"
            className="flex items-center space-x-2 group decoration-0"
            title="TWIBBONK - Beranda"
          >
            <Circle className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-lg font-black tracking-wider text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              TWIBBONK
            </span>
          </a>

          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            aria-label="Toggle Mode Gelap/Terang"
          >
            {darkMode ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-[600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-grow w-full">
        
        {/* HEADER */}
        <header className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-gray-900 dark:text-white tracking-tight">
            Solusi Pasang Twibbon Instan Tanpa Ribet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
            TWIBBONK memudahkan Anda menggabungkan foto pribadi ke dalam bingkai kampanye, acara, atau kegiatan komunitas secara cepat, presisi, dan menjaga kualitas foto tetap tinggi.
          </p>
        </header>

        {/* WORKFLOW CARD */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-6 w-full">
          
          {/* ALERT SYSTEM */}
          {alert.message && (
            <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-medium w-full ${
              alert.type === 'error' 
                ? 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
            }`}>
              {alert.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-left leading-snug">{alert.message}</span>
            </div>
          )}

          {/* LANGKAH 1: UPLOAD BINGKAI */}
          {!frameImg && (
            <div className="space-y-3 w-full">
              <h2 className="text-base font-bold text-gray-900 dark:text-white text-left">
                Langkah Pertama: Unggah Bingkai
              </h2>
              <div className="relative aspect-square w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/50 transition-all group">
                <input 
                  type="file" 
                  accept="image/png" 
                  onChange={handleFrameUpload}
                  disabled={isUploadingFrame}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                />
                
                <div className="relative mb-3">
                  <div className={`p-4 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 transition-transform ${isUploadingFrame ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Upload className={`w-7 h-7 ${isUploadingFrame ? 'animate-bounce text-blue-600 dark:text-blue-400' : ''}`} />
                  </div>
                  {isUploadingFrame && (
                    <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
                  )}
                </div>

                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1">
                  {isUploadingFrame ? 'Memeriksa Transparansi Bingkai...' : 'Unggah File Bingkai PNG Transparan'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isUploadingFrame ? 'Mohon tunggu sebentar' : 'Pastikan bingkai memiliki bidang transparan'}
                </p>
              </div>
            </div>
          )}

          {/* PREVIEW BINGKAI & LANGKAH 2 */}
          {frameImg && (
            <div className="space-y-5 w-full">
              
              {/* KARTU PREVIEW BINGKAI */}
              <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-700/80 w-full">
                <div className="w-14 h-14 bg-checkered rounded-lg flex-shrink-0 overflow-hidden">
                  <img src={frameImg.src} alt="Preview Bingkai" className="w-full h-full object-contain block" />
                </div>

                <div className="flex-1 flex flex-col items-start text-left min-w-0">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                    Dimensi Asli Bingkai:
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {frameDimensions.width} × {frameDimensions.height} px
                  </p>
                  <label className="mt-1 cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 text-xs font-semibold transition-colors active:scale-95">
                    
                    <span>Ganti Bingkai</span>
                    <input type="file" accept="image/png" onChange={handleFrameUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* LANGKAH 2: UPLOAD FOTO */}
              {!userImg && (
                <div className="space-y-3 w-full">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white text-left">
                    Langkah Kedua: Unggah Foto Kamu
                  </h2>
                  <div className="relative aspect-square w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-gray-50/30 dark:bg-slate-800/50 transition-all group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUserImgUpload}
                      disabled={isUploadingUserImg}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                    />

                    <div className="relative mb-3">
                      <div className={`p-4 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 transition-transform ${isUploadingUserImg ? 'scale-110' : 'group-hover:scale-105'}`}>
                        <ImageIcon className={`w-7 h-7 ${isUploadingUserImg ? 'animate-bounce text-blue-600 dark:text-blue-400' : ''}`} />
                      </div>
                      {isUploadingUserImg && (
                        <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
                      )}
                    </div>

                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1">
                      {isUploadingUserImg ? 'Memuat Foto Kamu...' : 'Unggah Foto Yang Ingin Dipasang'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isUploadingUserImg ? 'Mohon tunggu sebentar' : 'Mendukung JPG, PNG, WEBP'}
                    </p>
                  </div>
                </div>
              )}

              {/* EDITOR CANVAS */}
              {userImg && (
                <div className="space-y-4 w-full">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white text-left">
                    Sesuaikan Posisi Foto
                  </h2>

                  <div className="flex flex-col items-center w-full">
                    {!isLocked && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                        <span className="flex items-center gap-1.5"><Move className="w-3.5 h-3.5" /> Geser foto</span>
                        <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5" /> Zoom</span>
                      </div>
                    )}

                    <div 
                      style={{ aspectRatio: canvasAspectRatio }}
                      className={`relative w-full bg-checkered rounded-2xl overflow-hidden touch-none ${
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
                      <canvas ref={canvasRef} className="w-full h-full block" />
                    </div>

                    <div className="mt-5 w-full flex flex-col gap-2.5">
                      {!isLocked && (
                        <button
                          onClick={handleProcessTwibbon}
                          disabled={isProcessing}
                          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Memproses...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Buat Twibbon</span>
                            </>
                          )}
                        </button>
                      )}

                      {isLocked && (
                        <div className="flex items-center gap-2.5 w-full">
                          
                          {/* SPLIT BUTTON UNDUH + DROPDOWN CARETS */}
                          <div ref={dropdownRef} className="relative flex-1 flex rounded-xl shadow-sm">
                            {/* TOMBOL UTAMA UNDUH */}
                            <button
                              onClick={() => handleDownload(downloadFormat)}
                              disabled={isDownloading}
                              className="flex-1 h-12 px-3 sm:px-4 rounded-l-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-90"
                              title={`Unduh format ${downloadFormat.toUpperCase()}`}
                            >
                              <Download className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isDownloading ? 'animate-bounce' : ''}`} />
                              <span>{isDownloading ? 'Mengunduh...' : `Unduh ${downloadFormat.toUpperCase()}`}</span>
                            </button>

                            {/* TOMBOL CARETS (DROPDOWN TRIGGER) */}
                            <button
                              onClick={() => setIsFormatMenuOpen((prev) => !prev)}
                              disabled={isDownloading}
                              className="h-12 px-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-r-xl border-l border-emerald-500/40 transition-all flex items-center justify-center cursor-pointer"
                              title="Pilih Format Unduhan (.png / .jpg)"
                              aria-label="Pilih Format Unduhan"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFormatMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* MENU DROPDOWN PILIHAN FORMAT */}
                            {isFormatMenuOpen && (
                              <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="p-1.5 space-y-1 text-left">
                                  <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                                    Pilih Format Gambar
                                  </p>

                                  {/* OPTION PNG */}
                                  <button
                                    onClick={() => handleSelectFormat('png')}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                                      downloadFormat === 'png' 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex flex-col items-start">
                                      <span>.PNG (Transparan)</span>
                                      <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Kualitas Khas PNG</span>
                                    </div>
                                    {downloadFormat === 'png' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                  </button>

                                  {/* OPTION JPG */}
                                  <button
                                    onClick={() => handleSelectFormat('jpg')}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                                      downloadFormat === 'jpg' 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <div className="flex flex-col items-start">
                                      <span>.JPG (Standar)</span>
                                      <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Ukuran Lebih Ringan</span>
                                    </div>
                                    {downloadFormat === 'jpg' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={handleShare}
                            className="h-12 aspect-square rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95 text-gray-700 dark:text-gray-200 font-semibold transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                            title="Bagikan"
                            aria-label="Bagikan"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>

                          <button
                            onClick={handleReEdit}
                            className="h-12 aspect-square rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 text-gray-600 dark:text-gray-300 font-semibold transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                            title="Edit Lagi"
                            aria-label="Edit Lagi"
                          >
                            <Settings2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* CATATAN PRIVASI */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/60 flex items-start gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl text-left w-full">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Jaminan Privasi:</strong> Foto & bingkai diproses sepenuhnya di browser kamu secara lokal, tidak pernah diunggah atau disimpan ke server mana pun. Privasi kamu 100% aman.
            </p>
          </div>

        </section>

        {/* ARTIKEL SEO / INFORMASI */}
        <article className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed text-left w-full">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2.5">
            Mengapa Harus Menggunakan TWIBBONK?
          </h2>
          <p className="mb-3">
            Di era digital saat ini, twibbon menjadi media yang sangat efektif untuk mengampanyekan gerakan, merayakan momen penting, hingga meningkatkan kesadaran suatu acara. **TWIBBONK** hadir untuk memberikan pengalaman pembuatan twibbon yang instan, mudah, dan profesional.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Tanpa Registrasi:</strong> Langsung pakai tanpa perlu membuat akun atau login.</li>
            <li><strong>Presisi Tinggi:</strong> Dilengkapi fitur geser dan zoom intuitif untuk menyesuaikan posisi foto secara sempurna.</li>
            <li><strong>Kualitas Asli Terjaga:</strong> Mempertahankan resolusi bingkai asli tanpa kompresi berlebih.</li>
            <li><strong>100% Aman & Cepat:</strong> Proses render instant menggunakan teknologi HTML5 Canvas langsung di perangkat Anda.</li>
          </ul>
        </article>

      </main>

      {/* FOOTER DENGAN LINK ANCHOR STANDAR */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-[600px] mx-auto px-4">
          <p>
            © {new Date().getFullYear()}{' '}
            <a 
              href="/" 
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              TWIBBONK
            </a>
            . All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
