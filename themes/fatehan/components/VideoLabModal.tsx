import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { FatehanLogo } from '../ui/FatehanLogo';
import { BiDiText } from '../ui/BiDiText';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Bot,
} from 'lucide-react';

export const VideoLabModal: React.FC = () => {
  const { activeVideoModal, closeVideoModal, navigateStore, settings } = useFatehanTheme();
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(18);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [sourceType, setSourceType] = useState<'native_mp4' | 'aparat_embed'>('native_mp4');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const chapters =
    activeVideoModal.chapters && activeVideoModal.chapters.length > 0
      ? activeVideoModal.chapters
      : [
          {
            time: '00:00',
            title: `آشنایی با کارگاه عملی و تجهیزات ${settings.academyNameFa}`,
            desc: 'معرفی میزهای الکترونیک، پرینترهای سه‌بعدی و کیت‌های استاندارد کارگاهی',
          },
          {
            time: '01:15',
            title: 'مسیر آموزشی ۵ دپارتمان تخصصی از ۷ تا ۱۸ سال',
            desc: 'رباتیک، برنامه‌نویسی اسکرچ و پایتون، مکانیک، الکترونیک و چاپ سه‌بعدی',
          },
          {
            time: '02:40',
            title: 'پروژه‌های عملی کارآموزان و مسابقات کشوری',
            desc: 'نمایش ربات‌های ساخته‌شده توسط دانش‌آموزان در پایان ترم‌های آموزشی',
          },
        ];

  useEffect(() => {
    if (!activeVideoModal.open || !isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : Number((prev + 0.5).toFixed(1))));
    }, 200);
    return () => clearInterval(interval);
  }, [activeVideoModal.open, isPlaying]);

  useEffect(() => {
    if (!activeVideoModal.open || sourceType !== 'native_mp4') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame += isPlaying ? 1 : 0;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#111827');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 16) {
          const y =
            h * 0.55 +
            Math.sin((x + frame * 3 + i * 35) * 0.015) * (18 + i * 5) +
            (i - 4) * 16;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      for (let n = 0; n < 6; n++) {
        const nx = ((n + 1) * w) / 7;
        const ny = h * 0.5 + Math.cos((frame * 2 + n * 40) * 0.03) * 28;
        ctx.fillStyle = n % 2 === 0 ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeVideoModal.open, isPlaying, sourceType]);

  return (
    <AnimatePresence>
      {activeVideoModal.open && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeVideoModal}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.22 }}
            className="relative z-10 w-full max-w-4xl bg-slate-900 text-white border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FatehanLogo size="xs" variant="mark" theme="dark" />
                <div className="min-w-0">
                  <BiDiText as="h3" className="text-xs sm:text-sm font-extrabold text-white truncate">
                    {activeVideoModal.title}
                  </BiDiText>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeVideoModal.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSourceType('native_mp4')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      sourceType === 'native_mp4'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    پخش‌کننده اختصاصی MP4
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('aparat_embed')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      sourceType === 'aparat_embed'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    استریم آپارات / یوتیوب
                  </button>
                </div>

                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative bg-slate-950 aspect-video w-full overflow-hidden flex items-center justify-center">
              {activeVideoModal.videoUrl && activeVideoModal.videoUrl.endsWith('.mp4') ? (
                <video
                  src={activeVideoModal.videoUrl}
                  controls
                  autoPlay
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    width={960}
                    height={540}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  <div className="relative z-10 p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-4 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-mono">
                      <Film className="w-3.5 h-3.5" />
                      <span>
                        {sourceType === 'native_mp4'
                          ? 'FATEHAN ACADEMY HD VIDEO STREAM'
                          : 'APARAT / YOUTUBE EMBED STREAM'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-6 py-2">
                      <Bot className="w-10 h-10 text-amber-400 stroke-[1.5]" />
                      <ShieldCheck className="w-12 h-12 text-emerald-400 stroke-[1.5]" />
                      <Cpu className="w-10 h-10 text-sky-400 stroke-[1.5]" />
                    </div>

                    <h4 className="text-base sm:text-xl font-extrabold text-white leading-snug">
                      {chapters[activeChapter]?.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {chapters[activeChapter]?.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="absolute bottom-16 right-5 z-20 w-11 h-11 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>

                  <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-4 space-y-2">
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = Math.max(
                          0,
                          Math.min(100, ((rect.right - e.clientX) / rect.width) * 100)
                        );
                        setProgress(Number(pct.toFixed(1)));
                      }}
                      className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                    >
                      <div
                        style={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-l from-amber-400 to-indigo-500 rounded-full transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPlaying((p) => !p)}
                          className="hover:text-white cursor-pointer"
                        >
                          {isPlaying ? 'PAUSE' : 'PLAY'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMuted((m) => !m)}
                          className="hover:text-white cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <span>{progress.toFixed(0)}% · 03:45</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-emerald-400 font-bold">1080p Full HD</span>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveChapter(idx);
                      setProgress(idx * 33 + 10);
                      setIsPlaying(true);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      activeChapter === idx
                        ? 'bg-indigo-950/80 border-indigo-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-1">
                      <span>فصل ۰{idx + 1}</span>
                      <span>{ch.time}</span>
                    </div>
                    <div className="text-xs font-bold line-clamp-1">{ch.title}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>پشتیبانی کامل از ویدیوهای آموزشی، تیزر دوره‌ها و کیت‌های رباتیک</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeVideoModal();
                    navigateStore('/shop');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  مشاهده و خرید کیت‌های معرفی‌شده
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
