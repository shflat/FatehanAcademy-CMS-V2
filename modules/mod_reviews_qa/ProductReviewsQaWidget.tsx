import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, Star } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { OfflineCaptchaWidget } from '../../src/components/OfflineCaptchaWidget';

interface PublicReview {
  id: string;
  author_name: string;
  rating: number;
  comment_text: string;
  verified_buyer: number;
  admin_reply?: string;
  created_at_fa: string;
}

interface PublicQa {
  id: string;
  author_name: string;
  question_text: string;
  answer_text?: string;
  created_at_fa: string;
}

export const ProductReviewsQaWidget: React.FC<{
  productId: string;
  defaultName?: string;
  defaultPhone?: string;
}> = ({ productId, defaultName = '', defaultPhone = '' }) => {
  const [tab, setTab] = useState<'reviews' | 'qa'>('reviews');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [questions, setQuestions] = useState<PublicQa[]>([]);
  const [avgRating, setAvgRating] = useState(5.0);

  const [authorName, setAuthorName] = useState(defaultName);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSignal, setCaptchaSignal] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    void apiJson<{ reviews?: PublicReview[]; questions?: PublicQa[]; avgRating?: number }>(
      `/api/v1/modules/reviews-qa/product/${encodeURIComponent(productId)}`
    ).then(({ ok, data }) => {
      if (!ok) return;
      setReviews(data.reviews || []);
      setQuestions(data.questions || []);
      if (typeof data.avgRating === 'number') setAvgRating(data.avgRating);
    });
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const endpoint =
      tab === 'reviews' ? '/api/v1/modules/reviews-qa/review' : '/api/v1/modules/reviews-qa/question';
    const body =
      tab === 'reviews'
        ? {
            productId,
            authorName,
            authorPhone: defaultPhone,
            rating,
            commentText: text,
            captchaToken,
            captchaAnswer,
          }
        : { productId, authorName, questionText: text, captchaToken, captchaAnswer };

    const { ok, data } = await apiJson<{ error?: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) {
      setFeedback({ ok: false, msg: data.error || 'خطا در ثبت اطلاعات' });
      setCaptchaSignal((n) => n + 1);
      return;
    }
    setText('');
    setCaptchaAnswer('');
    setCaptchaSignal((n) => n + 1);
    setFeedback({
      ok: true,
      msg:
        tab === 'reviews'
          ? 'دیدگاه شما ثبت شد و پس از تایید مدیر نمایش داده می‌شود.'
          : 'پرسش شما ثبت شد و پس از پاسخ کارشناس منتشر خواهد شد.',
    });
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('reviews')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
              tab === 'reviews'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>دیدگاه خریداران ({reviews.length.toLocaleString('fa-IR')})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('qa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
              tab === 'qa'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>پرسش و پاسخ ({questions.length.toLocaleString('fa-IR')})</span>
          </button>
        </div>

        <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1 smooth-nums">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>میانگین امتیاز: {avgRating} از ۵</span>
        </div>
      </div>

      {/* Existing items */}
      <div className="space-y-3">
        {tab === 'reviews' ? (
          reviews.length === 0 ? (
            <p className="text-xs text-stone-400">اولین نفری باشید که درباره این محصول دیدگاه ثبت می‌کند.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold">
                    <span>{r.author_name}</span>
                    {r.verified_buyer === 1 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> خریدار محصول
                      </span>
                    )}
                  </div>
                  <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">{r.comment_text}</p>
                {r.admin_reply && (
                  <div className="p-2 rounded-lg bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 text-[11px] font-bold">
                    پاسخ پشتیبانی: {r.admin_reply}
                  </div>
                )}
              </div>
            ))
          )
        ) : questions.length === 0 ? (
          <p className="text-xs text-stone-400">هنوز پرسشی درباره این محصول ثبت نشده است.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
              <div className="font-extrabold">{q.author_name} پرسید:</div>
              <p className="text-stone-600 dark:text-stone-300">{q.question_text}</p>
              {q.answer_text && (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  پاسخ کارشناس: {q.answer_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Submission form with Native Offline Anti-Bot Captcha */}
      <form onSubmit={(e) => void handleSubmit(e)} className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="نام شما"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          {tab === 'reviews' && (
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
            >
              <option value={5}>★★★★★ عالی (۵ ستاره)</option>
              <option value={4}>★★★★ خوب (۴ ستاره)</option>
              <option value={3}>★★★ متوسط (۳ ستاره)</option>
              <option value={2}>★★ ضعیف (۲ ستاره)</option>
              <option value={1}>★ بسیار ضعیف (۱ ستاره)</option>
            </select>
          )}
        </div>
        <textarea
          rows={3}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tab === 'reviews' ? 'تجربه خود از این محصول را بنویسید...' : 'پرسش خود را بپرسید...'}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />

        <OfflineCaptchaWidget
          compact
          value={captchaAnswer}
          refreshSignal={captchaSignal}
          onChange={(ans, tok) => {
            setCaptchaAnswer(ans);
            setCaptchaToken(tok);
          }}
        />

        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold ${
              feedback.ok ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer"
        >
          {tab === 'reviews' ? 'ثبت دیدگاه و امتیاز' : 'ارسال پرسش'}
        </button>
      </form>
    </section>
  );
};
