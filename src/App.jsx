import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Frame,
  Upload,
  RefreshCw,
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  ZoomIn,
  Move,
} from 'lucide-react';

export default function App() {
  // =========================================================
  // THEME
  // =========================================================
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  // =========================================================
  // IMAGE STATE
  // =========================================================
  const [frameImg, setFrameImg] = useState(null);
  const [frameDimensions, setFrameDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [userImg, setUserImg] = useState(null);

  // =========================================================
  // ALERT
  // =========================================================
  const [alert, setAlert] = useState({
    type: '',
    message: '',
  });

  // =========================================================
  // CANVAS TRANSFORM
  // =========================================================
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // =========================================================
  // REFS
  // =========================================================
  const canvasRef = useRef(null);

  const interactionRef = useRef({
    active: false,
    mode: 'none',
    startX: 0,
    startY: 0,
    startPositionX: 0,
    startPositionY: 0,
    startDistance: 0,
    startScale: 1,
    pointers: new Map(),
  });

  // =========================================================
  // THEME TOGGLE
  // =========================================================
  const toggleTheme = () => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  // =========================================================
  // INITIAL THEME
  // =========================================================
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  // =========================================================
  // FRAME UPLOAD
  // =========================================================
  const handleFrameUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.type !== 'image/png') {
      setAlert({
        type: 'error',
        message:
          'Format bingkai harus PNG transparan. Silakan pilih file PNG.',
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d', {
          willReadFrequently: true,
        });

        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );

        const data = imageData.data;
        let hasAlpha = false;

        // Sampel alpha untuk validasi transparansi.
        // Tidak perlu memeriksa seluruh pixel agar PNG besar tetap ringan.
        const step = Math.max(4, Math.floor(data.length / 100000));

        for (let i = 3; i < data.length; i += step) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }

        if (!hasAlpha) {
          setAlert({
            type: 'error',
            message:
              'Gagal! Bingkai tidak memiliki area transparan. Pastikan PNG memiliki bagian transparan.',
          });

          URL.revokeObjectURL(url);
          return;
        }

        setFrameImg(img);

        setFrameDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        setUserImg(null);
        setScale(1);
        setPosition({
          x: 0,
          y: 0,
        });

        setIsLocked(false);

        setAlert({
          type: 'success',
          message: 'Bingkai transparan valid dan berhasil diunggah!',
        });
      } catch (error) {
        console.error(error);

        setAlert({
          type: 'error',
          message:
            'Gagal membaca transparansi bingkai. Silakan gunakan PNG transparan lainnya.',
        });

        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      setAlert({
        type: 'error',
        message: 'File bingkai tidak dapat dibaca.',
      });
    };

    img.src = url;
  };

  // =========================================================
  // USER IMAGE UPLOAD
  // =========================================================
  const handleUserImgUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlert({
        type: 'error',
        message: 'Silakan pilih file gambar JPG, PNG, atau WEBP.',
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setUserImg(img);

      setScale(1);

      setPosition({
        x: 0,
        y: 0,
      });

      setIsLocked(false);

      setAlert({
        type: 'success',
        message: 'Foto berhasil diunggah. Silakan sesuaikan posisinya.',
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      setAlert({
        type: 'error',
        message: 'Foto tidak dapat dibaca oleh browser.',
      });
    };

    img.src = url;
  };

  // =========================================================
  // DRAW CANVAS
  // =========================================================
  useEffect(() => {
    if (!canvasRef.current || !frameImg) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const width = frameDimensions.width || 1080;
    const height = frameDimensions.height || 1080;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // -------------------------------------------------------
    // BACKGROUND FOTO USER
    // -------------------------------------------------------
    if (userImg) {
      ctx.save();

      ctx.translate(
        width / 2 + position.x,
        height / 2 + position.y
      );

      ctx.scale(scale, scale);

      const userAspect =
        userImg.naturalWidth / userImg.naturalHeight;

      let drawWidth = width;
      let drawHeight = width / userAspect;

      // Cover canvas
      if (drawHeight < height) {
        drawHeight = height;
        drawWidth = height * userAspect;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        userImg,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();
    }

    // -------------------------------------------------------
    // FRAME
    // -------------------------------------------------------
    ctx.save();

    ctx.globalAlpha =
      isInteracting && !isLocked ? 0.65 : 1;

    ctx.drawImage(
      frameImg,
      0,
      0,
      width,
      height
    );

    ctx.restore();
  }, [
    frameImg,
    userImg,
    frameDimensions,
    position,
    scale,
    isInteracting,
    isLocked,
  ]);

  // =========================================================
  // POINTER HELPERS
  // =========================================================
  const getPointerDistance = (p1, p2) => {
    return Math.hypot(
      p1.clientX - p2.clientX,
      p1.clientY - p2.clientY
    );
  };

  const getCanvasScaleFactor = () => {
    const canvas = canvasRef.current;

    if (!canvas) return 1;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width) return 1;

    return canvas.width / rect.width;
  };

  // =========================================================
  // POINTER DOWN
  // =========================================================
  const handlePointerDown = (e) => {
    if (isLocked || !userImg) return;

    e.preventDefault();

    const state = interactionRef.current;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (error) {
      // Browser tertentu tidak mendukung capture.
    }

    state.pointers.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    setIsInteracting(true);

    // -------------------------------------------------------
    // 2 POINTER = ZOOM
    // -------------------------------------------------------
    if (state.pointers.size === 2) {
      const points = Array.from(state.pointers.values());

      state.mode = 'zoom';

      state.startDistance = getPointerDistance(
        points[0],
        points[1]
      );

      state.startScale = scale;

      return;
    }

    // -------------------------------------------------------
    // 1 POINTER = PAN
    // -------------------------------------------------------
    state.mode = 'pan';

    state.startX = e.clientX;
    state.startY = e.clientY;

    state.startPositionX = position.x;
    state.startPositionY = position.y;
  };

  // =========================================================
  // POINTER MOVE
  // =========================================================
  const handlePointerMove = (e) => {
    if (isLocked || !userImg) return;

    const state = interactionRef.current;

    if (!state.pointers.has(e.pointerId)) return;

    e.preventDefault();

    state.pointers.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    // -------------------------------------------------------
    // ZOOM
    // -------------------------------------------------------
    if (state.pointers.size >= 2) {
      const points = Array.from(state.pointers.values());

      const distance = getPointerDistance(
        points[0],
        points[1]
      );

      if (state.startDistance > 0) {
        const factor =
          distance / state.startDistance;

        const newScale = Math.min(
          Math.max(
            state.startScale * factor,
            0.2
          ),
          5
        );

        setScale(newScale);
      }

      return;
    }

    // -------------------------------------------------------
    // PAN
    // -------------------------------------------------------
    if (state.mode === 'pan') {
      const dx =
        e.clientX - state.startX;

      const dy =
        e.clientY - state.startY;

      const factor =
        getCanvasScaleFactor();

      setPosition({
        x:
          state.startPositionX +
          dx * factor,

        y:
          state.startPositionY +
          dy * factor,
      });
    }
  };

  // =========================================================
  // POINTER UP
  // =========================================================
  const handlePointerUp = (e) => {
    const state = interactionRef.current;

    state.pointers.delete(e.pointerId);

    if (state.pointers.size === 0) {
      state.active = false;
      state.mode = 'none';
      setIsInteracting(false);
    }

    // Kalau masih ada satu jari setelah pinch,
    // jadikan kembali sebagai titik awal drag.
    if (state.pointers.size === 1) {
      const remaining =
        Array.from(state.pointers.values())[0];

      state.mode = 'pan';

      state.startX =
        remaining.clientX;

      state.startY =
        remaining.clientY;

      state.startPositionX =
        position.x;

      state.startPositionY =
        position.y;
    }
  };

  // =========================================================
  // POINTER CANCEL
  // =========================================================
  const handlePointerCancel = (e) => {
    const state = interactionRef.current;

    state.pointers.delete(e.pointerId);

    if (state.pointers.size === 0) {
      state.mode = 'none';
      setIsInteracting(false);
    }
  };

  // =========================================================
  // MOUSE WHEEL ZOOM
  // =========================================================
  const handleWheel = (e) => {
    if (isLocked || !userImg) return;

    e.preventDefault();

    const zoomFactor =
      e.deltaY < 0 ? 1.08 : 0.92;

    setScale((previous) =>
      Math.min(
        Math.max(
          previous * zoomFactor,
          0.2
        ),
        5
      )
    );
  };

  // =========================================================
  // PROCESS TWIBBON
  // =========================================================
  const handleProcessTwibbon = () => {
    if (!canvasRef.current || !userImg || !frameImg) {
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsLocked(true);

      setAlert({
        type: 'success',
        message:
          'Twibbon berhasil dibuat. Foto siap diunduh atau dibagikan.',
      });
    }, 900);
  };

  // =========================================================
  // DOWNLOAD
  // =========================================================
  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      const link =
        document.createElement('a');

      link.download =
        `Twibbon_BINGKAI_${Date.now()}.png`;

      link.href =
        canvasRef.current.toDataURL(
          'image/png'
        );

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (error) {
      console.error(error);

      setAlert({
        type: 'error',
        message:
          'Gagal mengunduh gambar. Silakan coba lagi.',
      });
    }
  };

  // =========================================================
  // SHARE
  // =========================================================
  const handleShare = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            setAlert({
              type: 'error',
              message:
                'Gagal membuat file untuk dibagikan.',
            });
            return;
          }

          const file = new File(
            [blob],
            'twibbon-bingkai.png',
            {
              type: 'image/png',
            }
          );

          if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({
              files: [file],
            })
          ) {
            try {
              await navigator.share({
                title: 'Twibbon Saya',
                text:
                  'Lihat twibbon keren yang saya buat di BINGKAI!',
                files: [file],
              });
            } catch (error) {
              if (
                error?.name !==
                'AbortError'
              ) {
                console.error(error);
              }
            }
          } else {
            setAlert({
              type: 'error',
              message:
                'Fitur berbagi langsung tidak didukung browser ini. Silakan gunakan tombol Unduh.',
            });
          }
        },
        'image/png'
      );
    } catch (error) {
      console.error(error);

      setAlert({
        type: 'error',
        message:
          'Gagal menyiapkan gambar untuk dibagikan.',
      });
    }
  };

  // =========================================================
  // RESET / EDIT AGAIN
  // =========================================================
  const handleEditAgain = () => {
    setIsLocked(false);

    setAlert({
      type: 'success',
      message:
        'Mode edit aktif kembali. Silakan sesuaikan foto.',
    });
  };

  // =========================================================
  // RESET FRAME
  // =========================================================
  const handleResetFrame = () => {
    setFrameImg(null);
    setUserImg(null);

    setFrameDimensions({
      width: 0,
      height: 0,
    });

    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setIsLocked(false);

    setAlert({
      type: '',
      message: '',
    });
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">

      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2 min-w-0">

            <div className="p-2 bg-brand-600 rounded-xl text-white shadow-md flex-shrink-0">
              <Frame className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <span className="text-lg sm:text-xl font-black tracking-wider bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              BINGKAI
            </span>

          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle Mode"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex-shrink-0"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>

        </div>

      </nav>

      {/* =====================================================
          MAIN
      ====================================================== */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-5 sm:py-8 flex-grow min-w-0">

        {/* ===================================================
            HEADER
        ==================================================== */}
        <header className="text-center mb-7 sm:mb-10 max-w-4xl mx-auto">

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 text-gray-900 dark:text-white leading-tight">
            Solusi Pasang Twibbon Instan Tanpa Ribet
          </h1>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
            BINGKAI memudahkan Anda menggabungkan foto pribadi ke dalam bingkai kampanye, acara, atau kegiatan komunitas secara cepat, presisi, dan menjaga kualitas foto tetap tinggi.
          </p>

        </header>

        {/* ===================================================
            WORKFLOW CARD
        ==================================================== */}
        <section className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12 min-w-0">

          {/* =================================================
              ALERT
          ================================================== */}
          {alert.message && (
            <div
              className={`mb-6 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
                alert.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              }`}
            >

              {alert.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}

              <span className="leading-relaxed">
                {alert.message}
              </span>

            </div>
          )}

          {/* =================================================
              STEP 1 - FRAME UPLOAD
          ================================================== */}
          {!frameImg && (
            <div className="space-y-4">

              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                Langkah 1: Unggah Bingkai (PNG Transparan)
              </h2>

              <div className="relative aspect-square w-full max-w-xl lg:max-w-2xl mx-auto border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-5 sm:p-8 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/50 transition-all group">

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
                  Format PNG Wajib Transparan
                </p>

              </div>

            </div>
          )}

          {/* =================================================
              STEP 1 SUCCESS + STEP 2
          ================================================== */}
          {frameImg && !userImg && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">

              {/* FRAME INFORMATION */}
              <div className="flex flex-col min-w-0">

                <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
                  Bingkai Berhasil Dipasang
                </h2>

                <div className="flex-1 flex items-center gap-4 p-4 sm:p-5 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-700 min-w-0">

                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600 bg-checkered flex-shrink-0">

                    <img
                      src={frameImg.src}
                      alt="Preview Bingkai"
                      className="w-full h-full object-contain"
                    />

                  </div>

                  <div className="flex flex-col items-start gap-3 min-w-0">

                    <div className="min-w-0">

                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Dimensi Asli Bingkai:
                      </p>

                      <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 break-words">
                        {frameDimensions.width} ×{' '}
                        {frameDimensions.height} px
                      </p>

                    </div>

                    <div className="flex flex-wrap gap-2">

                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors active:scale-95">

                        <RefreshCw className="w-3.5 h-3.5" />

                        <span>Ganti Bingkai</span>

                        <input
                          type="file"
                          accept="image/png"
                          onChange={handleFrameUpload}
                          className="hidden"
                        />

                      </label>

                      <button
                        onClick={handleResetFrame}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        Reset
                      </button>

                    </div>

                  </div>

                </div>

              </div>

              {/* USER PHOTO UPLOAD */}
              <div className="flex flex-col min-w-0">

                <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
                  Langkah Kedua: Unggah Foto Kamu
                </h2>

                <div className="relative aspect-square w-full max-w-xl mx-auto lg:max-w-none border-2 border-dashed border-brand-300 dark:border-brand-800 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-5 sm:p-8 text-center cursor-pointer bg-brand-50/20 dark:bg-slate-800/80 transition-all group">

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
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

          {/* =================================================
              EDITOR
          ================================================== */}
          {frameImg && userImg && (
            <div className="space-y-5">

              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                Sesuaikan Posisi Foto
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] gap-6 lg:gap-10 items-start">

                {/* =================================================
                    CANVAS COLUMN
                ================================================== */}
                <div className="w-full min-w-0">

                  {!isLocked && (
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400 mb-3">

                      <span className="flex items-center gap-1">
                        <Move className="w-3.5 h-3.5" />
                        Geser foto
                      </span>

                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Pinch / Wheel untuk Zoom
                      </span>

                    </div>
                  )}

                  {/* CANVAS */}
                  <div
                    style={{
                      touchAction: 'none',
                    }}
                    className={`relative aspect-square w-full max-w-[720px] mx-auto rounded-2xl overflow-hidden shadow-lg bg-checkered border border-gray-200 dark:border-slate-700 select-none ${
                      isLocked
                        ? 'cursor-not-allowed'
                        : 'cursor-grab active:cursor-grabbing'
                    }`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onWheel={handleWheel}
                  >

                    <canvas
                      ref={canvasRef}
                      className="w-full h-full block select-none"
                    />

                  </div>

                </div>

                {/* =================================================
                    CONTROLS COLUMN
                ================================================== */}
                <div className="w-full min-w-0 lg:sticky lg:top-24">

                  <div className="bg-gray-50 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5">

                    <div className="mb-5">

                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
                        Kontrol Twibbon
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Geser foto dengan satu jari atau mouse. Gunakan dua jari pada HP untuk memperbesar atau memperkecil.
                      </p>

                    </div>

                    {/* ZOOM INFO */}
                    <div className="grid grid-cols-2 gap-3 mb-5">

                      <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3">

                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                          Zoom
                        </p>

                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {Math.round(scale * 100)}%
                        </p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3">

                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                          Posisi
                        </p>

                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {Math.round(position.x)}, {Math.round(position.y)}
                        </p>

                      </div>

                    </div>

                    {/* ACTIONS */}
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

                    {/* LOCKED ACTIONS */}
                    {isLocked && (
                      <div className="space-y-3">

                        <button
                          onClick={handleDownload}
                          className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >

                          <Download className="w-5 h-5" />

                          <span>Unduh Twibbon</span>

                        </button>

                        <div className="grid grid-cols-2 gap-3">

                          <button
                            onClick={handleShare}
                            className="w-full py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                          >

                            <Share2 className="w-4 h-4" />

                            <span>Bagikan</span>

                          </button>

                          <button
                            onClick={handleEditAgain}
                            className="w-full py-3 px-3 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold transition-all flex items-center justify-center gap-2 text-sm"
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

            </div>
          )}

          {/* =================================================
              PRIVACY
          ================================================== */}
          <div className="mt-7 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100 dark:border-slate-700/60 flex items-start gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl">

            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />

            <p className="leading-relaxed">
              <strong>Jaminan Privasi:</strong>{' '}
              Foto & bingkai diproses sepenuhnya di browser kamu secara lokal, tidak pernah diunggah atau disimpan ke server mana pun.
            </p>

          </div>

        </section>

        {/* =====================================================
            INFORMATION ARTICLE
        ====================================================== */}
        <article className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 lg:p-8 border border-gray-100 dark:border-slate-700 shadow-sm text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Mengapa Harus Menggunakan BINGKAI?
          </h2>

          <p className="mb-4">
            Di era digital saat ini, twibbon menjadi media yang sangat efektif untuk mengampanyekan gerakan, merayakan momen penting, hingga meningkatkan kesadaran suatu acara. <strong>BINGKAI</strong> hadir untuk memberikan pengalaman pembuatan twibbon yang instan, mudah, dan profesional.
          </p>

          <ul className="list-disc pl-5 space-y-2 mb-0">

            <li>
              <strong>Tanpa Registrasi:</strong>{' '}
              Langsung pakai tanpa perlu membuat akun atau login.
            </li>

            <li>
              <strong>Presisi Tinggi:</strong>{' '}
              Dilengkapi fitur geser dan zoom intuitif untuk menyesuaikan posisi foto secara sempurna.
            </li>

            <li>
              <strong>Kualitas Asli Terjaga:</strong>{' '}
              Mempertahankan resolusi bingkai asli tanpa kompresi berlebih.
            </li>

            <li>
              <strong>100% Aman & Cepat:</strong>{' '}
              Proses render menggunakan teknologi HTML5 Canvas langsung di perangkat Anda.
            </li>

          </ul>

        </article>

      </main>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-gray-500 dark:text-gray-400">

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">

          <p>
            © {new Date().getFullYear()} BINGKAI. All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
}
