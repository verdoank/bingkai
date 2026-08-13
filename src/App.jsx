 import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Move
} from 'lucide-react';

export default function App() {
  // =========================================================
  // THEME
  // =========================================================
  const [darkMode, setDarkMode] = useState(() => {
    return (
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
    );
  });

  // =========================================================
  // IMAGE
  // =========================================================
  const [frameImg, setFrameImg] = useState(null);
  const [frameDimensions, setFrameDimensions] = useState({
    width: 0,
    height: 0
  });
  const [userImg, setUserImg] = useState(null);

  // =========================================================
  // ALERT
  // =========================================================
  const [alert, setAlert] = useState({
    type: '',
    message: ''
  });

  // =========================================================
  // UI STATE
  // =========================================================
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({
    x: 0,
    y: 0
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // =========================================================
  // REFS
  // =========================================================
  const canvasRef = useRef(null);

  const frameImgRef = useRef(null);
  const userImgRef = useRef(null);

  // Transform realtime.
  // Tidak memakai React state selama jari bergerak.
  const transformRef = useRef({
    x: 0,
    y: 0,
    scale: 1
  });

  // Pointer aktif
  const pointersRef = useRef(new Map());

  // Gesture
  const gestureRef = useRef({
    mode: 'none',

    startX: 0,
    startY: 0,

    startPositionX: 0,
    startPositionY: 0,

    startDistance: 0,
    startScale: 1
  });

  // RAF
  const rafRef = useRef(null);

  // Preview resolution.
  // Sengaja dibatasi supaya HP tidak menggambar canvas
  // 3000-4000px setiap frame ketika gesture berlangsung.
  const PREVIEW_MAX_SIZE = 1200;

  // =========================================================
  // THEME
  // =========================================================
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
          'Format bingkai harus bertipe PNG transparan!'
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const tempCanvas = document.createElement('canvas');

      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;

      const ctx = tempCanvas.getContext('2d', {
        willReadFrequently: true
      });

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      const data = imageData.data;

      let hasAlpha = false;

      const totalPixels = data.length / 4;

      // Sampel maksimal 100.000 pixel agar proses upload
      // tidak terlalu berat pada bingkai resolusi sangat besar.
      const step = Math.max(
        1,
        Math.floor(totalPixels / 100000)
      );

      for (
        let pixel = 0;
        pixel < totalPixels;
        pixel += step
      ) {
        if (data[pixel * 4 + 3] < 255) {
          hasAlpha = true;
          break;
        }
      }

      if (!hasAlpha) {
        setAlert({
          type: 'error',
          message:
            'Gagal! Bingkai tidak memiliki bidang transparan (Alpha Pixel). Pastikan memakai PNG transparan.'
        });

        URL.revokeObjectURL(url);
        return;
      }

      frameImgRef.current = img;

      setFrameImg(img);

      setFrameDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });

      setUserImg(null);
      userImgRef.current = null;

      transformRef.current = {
        x: 0,
        y: 0,
        scale: 1
      };

      setPosition({
        x: 0,
        y: 0
      });

      setScale(1);
      setIsLocked(false);

      setAlert({
        type: 'success',
        message:
          'Bingkai transparan valid dan berhasil diunggah!'
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      setAlert({
        type: 'error',
        message:
          'Bingkai tidak dapat dibaca oleh browser.'
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
        message:
          'File harus berupa gambar JPG, PNG, atau WEBP.'
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      userImgRef.current = img;

      setUserImg(img);

      transformRef.current = {
        x: 0,
        y: 0,
        scale: 1
      };

      setPosition({
        x: 0,
        y: 0
      });

      setScale(1);
      setIsLocked(false);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      setAlert({
        type: 'error',
        message:
          'Foto tidak dapat dibaca oleh browser.'
      });
    };

    img.src = url;
  };

  // =========================================================
  // GET PREVIEW SIZE
  // =========================================================
  const getPreviewSize = () => {
    const frame = frameImgRef.current;

    if (!frame) {
      return {
        width: 1080,
        height: 1080
      };
    }

    const originalWidth = frame.naturalWidth;
    const originalHeight = frame.naturalHeight;

    const largest =
      Math.max(
        originalWidth,
        originalHeight
      );

    if (largest <= PREVIEW_MAX_SIZE) {
      return {
        width: originalWidth,
        height: originalHeight
      };
    }

    const ratio =
      PREVIEW_MAX_SIZE / largest;

    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio)
    };
  };

  // =========================================================
  // DRAW PREVIEW
  // =========================================================
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = frameImgRef.current;
    const user = userImgRef.current;

    if (!canvas || !frame) return;

    const preview = getPreviewSize();

    if (
      canvas.width !== preview.width ||
      canvas.height !== preview.height
    ) {
      canvas.width = preview.width;
      canvas.height = preview.height;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const width = canvas.width;
    const height = canvas.height;

    // =======================================================
    // USER PHOTO
    // =======================================================
    if (user) {
      const x =
        transformRef.current.x *
        (width / frame.naturalWidth);

      const y =
        transformRef.current.y *
        (height / frame.naturalHeight);

      const currentScale =
        transformRef.current.scale;

      ctx.save();

      ctx.translate(
        width / 2 + x,
        height / 2 + y
      );

      ctx.scale(
        currentScale,
        currentScale
      );

      const aspect =
        user.naturalWidth /
        user.naturalHeight;

      let drawWidth = width;
      let drawHeight =
        width / aspect;

      if (drawHeight < height) {
        drawHeight = height;
        drawWidth =
          height * aspect;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';

      ctx.drawImage(
        user,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();
    }

    // =======================================================
    // FRAME
    // =======================================================
    ctx.save();

    // Hanya transparan ketika benar-benar sedang disentuh.
    ctx.globalAlpha =
      isInteracting && !isLocked
        ? 0.65
        : 1;

    ctx.drawImage(
      frame,
      0,
      0,
      width,
      height
    );

    ctx.restore();
  }, [isInteracting, isLocked]);

  // =========================================================
  // SCHEDULE DRAW
  // =========================================================
  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current =
      requestAnimationFrame(() => {
        rafRef.current = null;
        drawPreview();
      });
  }, [drawPreview]);

  // =========================================================
  // INITIAL / IMAGE CHANGE DRAW
  // =========================================================
  useEffect(() => {
    frameImgRef.current = frameImg;
    scheduleDraw();
  }, [frameImg, scheduleDraw]);

  useEffect(() => {
    userImgRef.current = userImg;
    scheduleDraw();
  }, [userImg, scheduleDraw]);

  // =========================================================
  // REDRAW WHEN INTERACTION STATE CHANGES
  // =========================================================
  useEffect(() => {
    scheduleDraw();
  }, [
    isInteracting,
    isLocked,
    scheduleDraw
  ]);

  // =========================================================
  // CLEANUP RAF
  // =========================================================
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // =========================================================
  // DISTANCE 2 POINTER
  // =========================================================
  const getDistance = (a, b) => {
    return Math.hypot(
      a.clientX - b.clientX,
      a.clientY - b.clientY
    );
  };

  // =========================================================
  // CANVAS MOVEMENT FACTOR
  // =========================================================
  const getMovementFactor = () => {
    const canvas = canvasRef.current;

    if (!canvas) return 1;

    const rect =
      canvas.getBoundingClientRect();

    if (!rect.width) return 1;

    // Posisi disimpan berdasarkan resolusi asli.
    return frameImgRef.current
      ? frameImgRef.current.naturalWidth /
          rect.width
      : canvas.width / rect.width;
  };

  // =========================================================
  // POINTER DOWN
  // =========================================================
  const handlePointerDown = (e) => {
    if (
      isLocked ||
      !userImgRef.current
    ) {
      return;
    }

    e.preventDefault();

    pointersRef.current.set(
      e.pointerId,
      {
        clientX: e.clientX,
        clientY: e.clientY
      }
    );

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch (error) {}

    const pointers = Array.from(
      pointersRef.current.values()
    );

    setIsInteracting(true);

    // =======================================================
    // TWO FINGER
    // =======================================================
    if (pointers.length === 2) {
      gestureRef.current.mode =
        'pinch';

      gestureRef.current.startDistance =
        getDistance(
          pointers[0],
          pointers[1]
        );

      gestureRef.current.startScale =
        transformRef.current.scale;

      return;
    }

    // =======================================================
    // ONE FINGER / MOUSE
    // =======================================================
    gestureRef.current.mode =
      'pan';

    gestureRef.current.startX =
      e.clientX;

    gestureRef.current.startY =
      e.clientY;

    gestureRef.current.startPositionX =
      transformRef.current.x;

    gestureRef.current.startPositionY =
      transformRef.current.y;
  };

  // =========================================================
  // POINTER MOVE
  // =========================================================
  const handlePointerMove = (e) => {
    if (
      isLocked ||
      !userImgRef.current ||
      !pointersRef.current.has(e.pointerId)
    ) {
      return;
    }

    e.preventDefault();

    pointersRef.current.set(
      e.pointerId,
      {
        clientX: e.clientX,
        clientY: e.clientY
      }
    );

    const pointers = Array.from(
      pointersRef.current.values()
    );

    // =======================================================
    // PINCH ZOOM
    // =======================================================
    if (pointers.length >= 2) {
      const distance = getDistance(
        pointers[0],
        pointers[1]
      );

      const startDistance =
        gestureRef.current.startDistance;

      if (startDistance > 0) {
        const factor =
          distance / startDistance;

        const newScale = Math.min(
          Math.max(
            gestureRef.current.startScale *
              factor,
            0.2
          ),
          5
        );

        // HANYA REF.
        // Tidak memicu React render.
        transformRef.current.scale =
          newScale;

        scheduleDraw();
      }

      return;
    }

    // =======================================================
    // PAN
    // =======================================================
    if (
      gestureRef.current.mode !==
      'pan'
    ) {
      return;
    }

    const dx =
      e.clientX -
      gestureRef.current.startX;

    const dy =
      e.clientY -
      gestureRef.current.startY;

    const factor =
      getMovementFactor();

    transformRef.current.x =
      gestureRef.current.startPositionX +
      dx * factor;

    transformRef.current.y =
      gestureRef.current.startPositionY +
      dy * factor;

    scheduleDraw();
  };

  // =========================================================
  // POINTER UP
  // =========================================================
  const handlePointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    } catch (error) {}

    pointersRef.current.delete(
      e.pointerId
    );

    const pointers = Array.from(
      pointersRef.current.values()
    );

    // =======================================================
    // SEMUA JARI/MOUSE SUDAH LEPAS
    // =======================================================
    if (pointers.length === 0) {
      gestureRef.current.mode =
        'none';

      // Simpan transform terakhir.
      setScale(
        transformRef.current.scale
      );

      setPosition({
        x: transformRef.current.x,
        y: transformRef.current.y
      });

      // INI PENTING:
      // transparansi langsung kembali normal.
      setIsInteracting(false);

      return;
    }

    // =======================================================
    // DARI 2 JARI MENJADI 1 JARI
    // =======================================================
    if (pointers.length === 1) {
      const pointer =
        pointers[0];

      gestureRef.current.mode =
        'pan';

      gestureRef.current.startX =
        pointer.clientX;

      gestureRef.current.startY =
        pointer.clientY;

      gestureRef.current.startPositionX =
        transformRef.current.x;

      gestureRef.current.startPositionY =
        transformRef.current.y;
    }
  };

  // =========================================================
  // POINTER CANCEL
  // =========================================================
  const handlePointerCancel = (e) => {
    pointersRef.current.delete(
      e.pointerId
    );

    if (
      pointersRef.current.size === 0
    ) {
      gestureRef.current.mode =
        'none';

      setScale(
        transformRef.current.scale
      );

      setPosition({
        x: transformRef.current.x,
        y: transformRef.current.y
      });

      // Pastikan transparansi kembali normal.
      setIsInteracting(false);
    }
  };

  // =========================================================
  // WHEEL ZOOM
  // =========================================================
  const handleWheel = (e) => {
    if (
      isLocked ||
      !userImgRef.current
    ) {
      return;
    }

    e.preventDefault();

    const zoomFactor =
      e.deltaY < 0
        ? 1.08
        : 0.92;

    transformRef.current.scale =
      Math.min(
        Math.max(
          transformRef.current.scale *
            zoomFactor,
          0.2
        ),
        5
      );

    scheduleDraw();

    // Simpan setelah wheel selesai secara visual.
    setScale(
      transformRef.current.scale
    );
  };

  // =========================================================
  // EXPORT FULL RESOLUTION
  // =========================================================
  const createFullResolutionCanvas = () => {
    const frame = frameImgRef.current;
    const user = userImgRef.current;

    if (!frame || !user) {
      return null;
    }

    const canvas =
      document.createElement('canvas');

    const width =
      frame.naturalWidth;

    const height =
      frame.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    // =======================================================
    // USER PHOTO - RESOLUSI ASLI
    // =======================================================
    const {
      x,
      y,
      scale: currentScale
    } = transformRef.current;

    ctx.save();

    ctx.translate(
      width / 2 + x,
      height / 2 + y
    );

    ctx.scale(
      currentScale,
      currentScale
    );

    const aspect =
      user.naturalWidth /
      user.naturalHeight;

    let drawWidth = width;
    let drawHeight =
      width / aspect;

    if (drawHeight < height) {
      drawHeight = height;
      drawWidth =
        height * aspect;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      user,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // =======================================================
    // FRAME FULL RESOLUTION
    // =======================================================
    ctx.save();

    ctx.globalAlpha = 1;

    ctx.drawImage(
      frame,
      0,
      0,
      width,
      height
    );

    ctx.restore();

    return canvas;
  };

  // =========================================================
  // PROCESS
  // =========================================================
  const handleProcessTwibbon = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setScale(
        transformRef.current.scale
      );

      setPosition({
        x: transformRef.current.x,
        y: transformRef.current.y
      });

      setIsProcessing(false);
      setIsLocked(true);
      setIsInteracting(false);

      setAlert({
        type: 'success',
        message:
          'Twibbon berhasil dibuat dan siap digunakan!'
      });
    }, 700);
  };

  // =========================================================
  // DOWNLOAD
  // =========================================================
  const handleDownload = () => {
    const output =
      createFullResolutionCanvas();

    if (!output) return;

    output.toBlob(
      (blob) => {
        if (!blob) return;

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement('a');

        link.href = url;

        link.download =
          `Twibbon_BINGKAI_${Date.now()}.png`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      },
      'image/png'
    );
  };

  // =========================================================
  // SHARE
  // =========================================================
  const handleShare = async () => {
    const output =
      createFullResolutionCanvas();

    if (!output) return;

    output.toBlob(
      async (blob) => {
        if (!blob) return;

        const file = new File(
          [blob],
          'twibbon.png',
          {
            type: 'image/png'
          }
        );

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({
            files: [file]
          })
        ) {
          try {
            await navigator.share({
              title: 'Twibbon Saya',
              text:
                'Lihat twibbon keren yang saya buat di BINGKAI!',
              files: [file]
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
              'Fitur berbagi file tidak didukung browser ini. Silakan gunakan tombol Unduh.'
          });
        }
      },
      'image/png'
    );
  };

  // =========================================================
  // EDIT LAGI
  // =========================================================
  const handleEditAgain = () => {
    setIsLocked(false);
    setIsInteracting(false);
    scheduleDraw();
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col font-sans bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 transition-colors duration-200">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">

        <div className="w-full max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="p-2 bg-brand-600 rounded-xl text-white shadow-md">
              <Frame className="w-5 h-5 sm:w-6 sm:h-6" />
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
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>

        </div>

      </nav>

      {/* MAIN */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 flex-grow min-w-0">

        {/* INTRO */}
        <header className="text-center mb-8">

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3 text-gray-900 dark:text-white leading-tight">
            Solusi Pasang Twibbon Instan Tanpa Ribet
          </h1>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
            BINGKAI memudahkan Anda menggabungkan foto pribadi ke dalam bingkai kampanye, acara, atau kegiatan komunitas secara cepat, presisi, dan menjaga kualitas foto tetap tinggi.
          </p>

        </header>

        {/* WORKFLOW */}
        <section className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-8">

          {/* ALERT */}
          {alert.message && (
            <div
              className={`mb-5 p-3.5 rounded-xl flex items-start gap-3 text-xs sm:text-sm font-medium ${
                alert.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              }`}
            >

              {alert.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              )}

              <span>
                {alert.message}
              </span>

            </div>
          )}

          {/* UPLOAD FRAME */}
          {!frameImg && (
            <div className="space-y-3">

              <h2 className="text-base sm:text-lg font-bold">
                Langkah 1: Unggah Bingkai (PNG Transparan)
              </h2>

              <div className="relative aspect-square w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-5 text-center cursor-pointer bg-gray-50/50 dark:bg-slate-800/50 transition-all group">

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

          {/* FRAME + USER */}
          {frameImg && !userImg && (
            <div className="space-y-6">

              {/* FRAME INFO */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-700">

                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-600 bg-checkered flex-shrink-0">

                  <img
                    src={frameImg.src}
                    alt="Preview Bingkai"
                    className="w-full h-full object-contain"
                  />

                </div>

                <div className="flex flex-col items-start gap-2 min-w-0">

                  <div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Dimensi Asli Bingkai:
                    </p>

                    <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100">
                      {frameDimensions.width} ×{' '}
                      {frameDimensions.height} px
                    </p>

                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">

                    <RefreshCw className="w-3.5 h-3.5" />

                    <span>Ganti Bingkai</span>

                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleFrameUpload}
                      className="hidden"
                    />

                  </label>

                </div>

              </div>

              {/* USER UPLOAD */}
              <div className="space-y-3">

                <h2 className="text-base sm:text-lg font-bold">
                  Langkah Kedua: Unggah Foto Kamu
                </h2>

                <div className="relative aspect-square w-full border-2 border-dashed border-brand-300 dark:border-brand-800 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center p-5 text-center cursor-pointer bg-brand-50/20 dark:bg-slate-800/80 transition-all group">

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

          {/* EDITOR */}
          {frameImg && userImg && (
            <div className="space-y-5">

              <h2 className="text-base sm:text-lg font-bold">
                Sesuaikan Posisi Foto
              </h2>

              {!isLocked && (
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">

                  <span className="flex items-center gap-1">
                    <Move className="w-3.5 h-3.5" />
                    Geser foto
                  </span>

                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    Pinch/Wheel untuk Zoom
                  </span>

                </div>
              )}

              {/* CANVAS */}
              <div
                style={{
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg bg-checkered border border-gray-200 dark:border-slate-700 ${
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
                  className="w-full h-full block"
                />

              </div>

              {/* ACTION */}
              <div className="w-full flex flex-col gap-3">

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

                {isLocked && (
                  <div className="space-y-3">

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
                        onClick={handleEditAgain}
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                      >

                        <RefreshCw className="w-4 h-4" />

                        <span>Edit Lagi</span>

                      </button>

                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

          {/* PRIVACY */}
          <div className="mt-7 pt-6 border-t border-gray-100 dark:border-slate-700/60 flex items-start gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl">

            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />

            <p className="leading-relaxed">
              <strong>Jaminan Privasi:</strong>{' '}
              Foto & bingkai diproses sepenuhnya di browser kamu secara lokal, tidak pernah diunggah atau disimpan ke server mana pun. Privasi kamu 100% aman.
            </p>

          </div>

        </section>

        {/* ARTICLE */}
        <article className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">

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

      {/* FOOTER */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-gray-500 dark:text-gray-400">

        <div className="w-full max-w-2xl mx-auto px-4">

          <p>
            © {new Date().getFullYear()} BINGKAI. All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
}   
