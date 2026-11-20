import React, { useMemo, useState } from 'react';
import {
  Check,
  Film,
  Image as ImageIcon,
  Link2,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import type { MediaAssetItem } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import {
  isVideoMediaUrl,
  resolveResponsiveMediaUrl,
} from '../../../data/mediaAssets';

export interface MediaPickerSelection {
  url: string;
  altText: string;
  title: string;
  mediaType: 'image' | 'video';
  variants?: MediaAssetItem['variants'];
}

interface MediaPickerModalProps {
  isOpen: boolean;
  mode: 'featured' | 'body' | 'gallery';
  allowVideo?: boolean;
  mediaItems: MediaAssetItem[];
  defaultCategory?: MediaAssetItem['category'];
  onClose: () => void;
  onSelect: (selection: MediaPickerSelection) => void;
  onMediaUploaded?: (uploaded: MediaAssetItem[]) => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  mode,
  allowVideo = true,
  mediaItems,
  defaultCategory = 'product',
  onClose,
  onSelect,
  onMediaUploaded,
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'video_url'>('library');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customAlt, setCustomAlt] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [externalVideoTitle, setExternalVideoTitle] = useState('');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mediaItems.filter((item) => {
      const isVid = item.mediaType === 'video' || isVideoMediaUrl(item.url, item.mimeType);
      if (!allowVideo && isVid) return false;
      if (kindFilter === 'image' && isVid) return false;
      if (kindFilter === 'video' && !isVid) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.altText || '').toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q)
      );
    });
  }, [mediaItems, search, kindFilter, allowVideo]);

  const selectedItem = useMemo(
    () => filteredItems.find((i) => i.id === selectedId) || mediaItems.find((i) => i.id === selectedId) || null,
    [filteredItems, mediaItems, selectedId]
  );

  if (!isOpen) return null;

  const handlePickItem = (item: MediaAssetItem) => {
    setSelectedId(item.id);
    setCustomTitle(item.title || '');
    setCustomAlt(item.altText || item.title || '');
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const filesPayload: Array<{
        name: string;
        title: string;
        dataUrl: string;
        category: MediaAssetItem['category'];
      }> = [];

      for (const file of Array.from(fileList)) {
        const isVideo = file.type.startsWith('video/');
        if (isVideo && !allowVideo) {
          throw new Error('برای تصویر شاخص، لطفاً فقط فایل تصویری انتخاب کنید.');
        }
        const maxMb = isVideo ? 35 : 15;
        if (file.size > maxMb * 1024 * 1024) {
          throw new Error(`حجم فایل «${file.name}» از حد مجاز (${maxMb} مگابایت) بیشتر است.`);
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(`خطا در خواندن فایل ${file.name}`));
          reader.readAsDataURL(file);
        });
        filesPayload.push({
          name: file.name,
          title: file.name.replace(/\.[^.]+$/, ''),
          dataUrl,
          category: defaultCategory,
        });
      }

      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: MediaAssetItem[];
        error?: string;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({ files: filesPayload }),
      });

      if (!ok || !data.items || data.items.length === 0) {
        throw new Error(data.error || 'خطا در آپلود رسانه روی سرور');
      }

      onMediaUploaded?.(data.items);
      const first = data.items[0];
      setSelectedId(first.id);
      setCustomTitle(first.title);
      setCustomAlt(first.altText || first.title);
      setActiveTab('library');
      onNotice?.(
        'success',
        first.mediaType === 'video'
          ? 'ویدیو با موفقیت آپلود و آماده درج در پلیر شد.'
          : 'تصویر به‌صورت خودکار بهینه‌سازی شد (تبدیل هوشمند چندسایزه WebP).'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در آپلود فایل';
      setUploadError(msg);
      onNotice?.('error', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmSelected = () => {
    if (!selectedItem) return;
    const isVid =
      selectedItem.mediaType === 'video' ||
      isVideoMediaUrl(selectedItem.url, selectedItem.mimeType);
    onSelect({
      url: selectedItem.url,
      altText: customAlt.trim() || selectedItem.altText || selectedItem.title,
      title: customTitle.trim() || selectedItem.title,
      mediaType: isVid ? 'video' : 'image',
      variants: selectedItem.variants,
    });
    onClose();
  };

  const handleConfirmExternalVideo = () => {
    const cleanUrl = externalVideoUrl.trim();
    if (!cleanUrl || !/^https?:\/\/|^\/uploads\//i.test(cleanUrl)) {
      setUploadError('لطفاً یک لینک معتبر ویدیو (شروع با https:// یا /uploads/) وارد کنید.');
      return;
    }
    onSelect({
      url: cleanUrl,
      altText: externalVideoTitle.trim() || 'ویدیوی آموزشی',
      title: externalVideoTitle.trim() || 'ویدیوی آموزشی',
      mediaType: 'video',
    });
    onClose();
  };

  const modalHeading =
    mode === 'featured'
      ? 'انتخاب یا آپلود تصویر شاخص'
      : mode === 'gallery'
      ? 'افزودن تصویر یا ویدیو به گالری'
      : 'درج تصویر یا پلیر ویدیو در محتوا';

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      data-lenis-prevent-wheel
      data-lenis-prevent-touch
      className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overscroll-contain"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                {modalHeading}
              </h3>
              <p className="text-[11px] text-stone-500">
                بدون خروج از ویرایشگر · هر فرمت تصویری به‌صورت خودکار بهینه‌سازی و در سایز متناسب نمایش داده می‌شود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن مودال رسانه"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-stone-900">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                activeTab === 'library'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              کتابخانه رسانه ({mediaItems.length.toLocaleString('fa-IR')})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'upload'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{allowVideo ? 'آپلود تصویر یا ویدیو' : 'آپلود تصویر جدید'}</span>
            </button>
            {allowVideo && (
              <button
                type="button"
                onClick={() => setActiveTab('video_url')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'video_url'
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>درج لینک مستقیم ویدیو</span>
              </button>
            )}
          </div>

          {activeTab === 'library' && (
            <div className="flex flex-wrap items-center gap-2">
              {allowVideo && (
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-[11px] font-bold">
                  {(['all', 'image', 'video'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKindFilter(k)}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        kindFilter === k
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                          : 'text-stone-500'
                      }`}
                    >
                      {k === 'all' ? 'همه' : k === 'image' ? 'تصاویر' : 'ویدیوها'}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در رسانه..."
                  className="pr-8 pl-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 w-44 sm:w-56"
                />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5"
        >
          {uploadError && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
              {uploadError}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Compact Square Media Grid */}
              <div className="lg:col-span-8">
                {filteredItems.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 space-y-2">
                    <p className="text-sm font-bold text-stone-500">
                      موردی یافت نشد. می‌توانید از تب «آپلود» فایل جدید اضافه کنید.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {filteredItems.map((item) => {
                      const isVid =
                        item.mediaType === 'video' || isVideoMediaUrl(item.url, item.mimeType);
                      const isSelected = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handlePickItem(item)}
                          title={item.title}
                          className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-stone-100 dark:bg-stone-950 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/30 scale-[0.98]'
                              : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'
                          }`}
                        >
                          {isVid ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-white p-2 text-center gap-1.5">
                              <Film className="w-7 h-7 text-sky-400" />
                              <span className="text-[10px] font-bold line-clamp-2 leading-tight">
                                {item.title}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={resolveResponsiveMediaUrl(item.url, 'thumb300', item.variants)}
                              alt={item.altText || item.title}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {isVid && (
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                              VIDEO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Attachment Details & Alt Editor */}
              <div className="lg:col-span-4 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3.5">
                {selectedItem ? (
                  <>
                    <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-16/10 bg-stone-950">
                      {selectedItem.mediaType === 'video' ||
                      isVideoMediaUrl(selectedItem.url, selectedItem.mimeType) ? (
                        <video
                          src={selectedItem.url}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={resolveResponsiveMediaUrl(
                            selectedItem.url,
                            'medium800',
                            selectedItem.variants
                          )}
                          alt={customAlt || selectedItem.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-500 mb-1">
                          عنوان رسانه
                        </label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-500 mb-1">
                          متن جایگزین سئو (Alt Text)
                        </label>
                        <input
                          type="text"
                          value={customAlt}
                          onChange={(e) => setCustomAlt(e.target.value)}
                          placeholder="توضیح دقیق برای موتورهای جستجو..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        {selectedItem.mediaType === 'video' ||
                        isVideoMediaUrl(selectedItem.url, selectedItem.mimeType)
                          ? 'پلیر اختصاصی HTML5 با کنترل کامل پخش در صفحه نمایش داده می‌شود.'
                          : 'سایز بهینه (کارت ۳۰۰px / صفحه ۸۰۰px / اصلی) به‌صورت خودکار انتخاب می‌شود.'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-stone-500 space-y-1">
                    <p className="font-bold text-stone-700 dark:text-stone-300">
                      یک تصویر یا ویدیو را انتخاب کنید
                    </p>
                    <p>
                      اطلاعات سئو، پیش‌نمایش و دکمه درج در همین بخش نمایش داده می‌شود.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="py-10 px-6 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-950/40 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {allowVideo
                    ? 'هر فرمت تصویر (JPG، PNG، WebP، GIF) یا ویدیو (MP4، WebM) را انتخاب کنید'
                    : 'هر فرمت تصویر استاندارد (JPG، PNG، WebP، GIF) را انتخاب کنید'}
                </h4>
                <p className="text-xs text-stone-500 max-w-lg mx-auto">
                  نیازی به تبدیل دستی عکس ندارید! سیستم به‌صورت خودکار تصویر شما را در ۴ سایز بهینه ذخیره کرده و در هر بخش سایت متناسب با ابعاد آن بارگذاری می‌کند.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer hover:bg-[#1E40AF] transition-colors shadow-sm">
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'در حال آپلود و بهینه‌سازی...' : 'انتخاب فایل از سیستم'}</span>
                <input
                  type="file"
                  multiple={mode !== 'featured'}
                  accept={allowVideo ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*'}
                  disabled={isUploading}
                  className="hidden"
                  onChange={(e) => void handleUploadFiles(e.target.files)}
                />
              </label>
            </div>
          )}

          {activeTab === 'video_url' && allowVideo && (
            <div className="max-w-xl mx-auto py-6 space-y-4">
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-stone-900 dark:text-white">
                  <Link2 className="w-4 h-4 text-[#1D4ED8]" />
                  <span>درج پلیر ویدیو از لینک مستقیم (MP4 / WebM)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    عنوان ویدیو (نمایش زیر پلیر)
                  </label>
                  <input
                    type="text"
                    value={externalVideoTitle}
                    onChange={(e) => setExternalVideoTitle(e.target.value)}
                    placeholder="مثال: دمو اجرای واقعی اسکیل در محیط پروژه"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    لینک مستقیم فایل ویدیو
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={externalVideoUrl}
                    onChange={(e) => setExternalVideoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/demo-video.mp4"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConfirmExternalVideo}
                  className="w-full py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer hover:bg-[#1E40AF]"
                >
                  درج پلیر ویدیو در ویرایشگر
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'library' && (
          <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/70 flex items-center justify-between gap-3">
            <span className="text-[11px] text-stone-500 font-bold">
              {selectedItem ? `انتخاب‌شده: ${selectedItem.title}` : 'هنوز رسانه‌ای انتخاب نشده است'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!selectedItem}
                onClick={handleConfirmSelected}
                className="px-5 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold disabled:opacity-40 cursor-pointer hover:bg-[#1E40AF]"
              >
                {mode === 'featured'
                  ? 'تنظیم به عنوان تصویر شاخص'
                  : mode === 'gallery'
                  ? 'افزودن به گالری'
                  : 'درج در متن'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
