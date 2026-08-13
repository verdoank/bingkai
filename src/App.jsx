import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, Moon, Frame, Upload, RefreshCw, Download, 
  Share2, AlertCircle, CheckCircle2, ShieldCheck, 
  Sparkles, Image as ImageIcon, ZoomIn, Move
} from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [frameImg, setFrameImg] = useState(null);
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const [userImg, setUserImg] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

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

      if (!hasAlpha) {
        setAlert({ 
          type: 'error', 
          message: 'Bingkai transparan tidak valid! Pastikan memakai file PNG transparan.' 
        });
        URL.revokeObjectURL(url);
      } else {
        setFrameImg(img);
        setFrameDimensions({ width: img.width, height: img.height });
        setAlert({ type: 'success', message: 'Bingkai transparan valid dan berhasil diunggah!' });
      }
    };
  };

  const handleUserImgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      setUserImg(img);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsLocked(false);
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
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsLocked(true);
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
          console.error(error);
        }
      } else {
        alert('Fitur berbagi tidak didukung di browser ini, silakan unduh secara langsung.');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-sm">
              <Frame className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-wider text-blue-600 dark:text-blue-400">
              BINGKAI
            </span>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER (DIKUNCI KE UKURAN MOBILE max-w-md TERPUSAT) */}
      <main className="max-w-md mx-auto px-4 py-6 flex-grow w-full">
        
        {/* HEADER */}
        <header className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold mb-2 text-gray-900 dark:text-white">
            Solusi Pasang Twibbon Instan Tanpa Ribet
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm leading-relaxed">
            BINGKAI memudahkan Anda menggabungkan foto pribadi ke dalam bingkai kampanye, acara, atau kegiatan komunitas secara cepat, presisi, dan menjaga kualitas foto tetap tinggi.
          </p>
        </header>

        {/* WORKFLOW CARD */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-4 sm:p-5 mb-6 w-full">
          
          {/* ALERT */}
          {alert.message && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium w-full ${
              alert.type === 'error' 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' 
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {alert.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              <span className="text-left leading-snug">{alert.message}</span>
            </div>
          )}

          {/* LANGKAH 1 */}
          {!frameImg && (
            <div className="space-y-3 w-full">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white text-left">
                Langkah Pertama: Unggah Bingkai
              </h2>
              <div className="relative aspect-square w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/50 transition-all">
                <input 
                  type="file" 
                  accept="image/png" 
                  onChange={handleFrameUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-3 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-semibold text-xs text-gray-700 dark:text-gray-200 mb-1">
                  Unggah File Bingkai PNG Transparan
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Pastikan bingkai memiliki bidang transparan
                </p>
              </div>
            </div>
          )}

          {/* PREVIEW BINGKAI & LANGKAH 2 */}
          {frameImg && (
            <div className="space-y-4 w-full">
              
              {/* KARTU PREVIEW BINGKAI */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-700/80 w-full">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600 bg-checkered flex-shrink-0">
                  <img src={frameImg.src} alt="Preview Bingkai" className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 flex flex-col items-start text-left min-w-0">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                    Dimensi Asli Bingkai:
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {frameDimensions.width} × {frameDimensions.height} px
                  </p>
                  <label className="mt-1 cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 text-[10px] font-semibold transition-colors">
                    <RefreshCw className="w-3 h-3" />
                    <span>Ganti Bingkai</span>
                    <input type="file" accept="image/png" onChange={handleFrameUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* LANGKAH 2: UPLOAD FOTO */}
              {!userImg && (
                <div className="space-y-3 w-full">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white text-left">
                    Langkah Kedua: Unggah Foto Kamu
                  </h2>
                  <div className="relative aspect-square w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-gray-50/30 dark:bg-slate-800/50 transition-all">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUserImgUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="p-3 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 mb-2">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-xs text-gray-700 dark:text-gray-200 mb-0.5">
                      Unggah Foto Yang Ingin Dipasang
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Mendukung JPG, PNG, WEBP
                    </p>
                  </div>
                </div>
              )}

              {/* EDITOR CANVAS */}
              {userImg && (
                <div className="space-y-4 w-full">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white text-left">
                    Sesuaikan Posisi Foto
                  </h2>

                  <div className="flex flex-col items-center w-full">
                    {!isLocked && (
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Geser foto</span>
                        <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                      </div>
                    )}

                    <div 
                      className={`relative aspect-square w-full rounded-xl overflow-hidden shadow-md bg-checkered border border-gray-200 dark:border-slate-700 touch-none ${
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

                    <div className="mt-4 w-full flex flex-col gap-2">
                      {!isLocked && (
                        <button
                          onClick={handleProcessTwibbon}
                          disabled={isProcessing}
                          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
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
                        <div className="space-y-2 w-full">
                          <button
                            onClick={handleDownload}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Unduh Twibbon</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={handleShare}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Bagikan</span>
                            </button>

                            <button
                              onClick={() => setIsLocked(false)}
                              className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Edit Lagi</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* CATATAN PRIVASI */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/60 flex items-start gap-2.5 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 p-3 rounded-xl text-left w-full">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Jaminan Privasi:</strong> Foto & bingkai diproses sepenuhnya di browser kamu secara lokal, tidak pernah diunggah atau disimpan ke server mana pun. Privasi kamu 100% aman.
            </p>
          </div>

        </section>

        {/* ARTIKEL SEO / INFORMASI */}
        <article className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-700 shadow-sm text-gray-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed text-left w-full">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            Mengapa Harus Menggunakan BINGKAI?
          </h2>
          <p className="mb-3">
            Di era digital saat ini, twibbon menjadi media yang sangat efektif untuk mengampanyekan gerakan, merayakan momen penting, hingga meningkatkan kesadaran suatu acara. **BINGKAI** hadir untuk memberikan pengalaman pembuatan twibbon yang instan, mudah, dan profesional.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong>Tanpa Registrasi:</strong> Langsung pakai tanpa perlu membuat akun atau login.</li>
            <li><strong>Presisi Tinggi:</strong> Dilengkapi fitur geser dan zoom intuitif untuk menyesuaikan posisi foto secara sempurna.</li>
            <li><strong>Kualitas Asli Terjaga:</strong> Mempertahankan resolusi bingkai asli tanpa kompresi berlebih.</li>
            <li><strong>100% Aman & Cepat:</strong> Proses render instant menggunakan teknologi HTML5 Canvas langsung di perangkat Anda.</li>
          </ul>
        </article>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-[11px] text-gray-500 dark:text-gray-400">
        <div className="max-w-md mx-auto px-4">
          <p>© {new Date().getFullYear()} BINGKAI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
