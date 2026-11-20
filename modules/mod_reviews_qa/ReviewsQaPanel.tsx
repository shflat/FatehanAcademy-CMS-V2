import React, { useEffect, useState } from 'react';
import { Check, MessageSquareText, Star, X } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface ReviewRow {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment_text: string;
  verified_buyer: number;
  status: string;
  admin_reply?: string;
  created_at_fa: string;
}

interface QaRow {
  id: string;
  product_id: string;
  author_name: string;
  question_text: string;
  answer_text?: string;
  status: string;
  created_at_fa: string;
}

export const ReviewsQaPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [questions, setQuestions] = useState<QaRow[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadAll = async () => {
    const { ok, data } = await apiJson<{ reviews?: ReviewRow[]; questions?: QaRow[] }>(
      '/api/v1/modules/reviews-qa/admin/list'
    );
    if (ok) {
      setReviews(data.reviews || []);
      setQuestions(data.questions || []);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleModerate = async (
    kind: 'review' | 'qa',
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    const { ok } = await apiJson('/api/v1/modules/reviews-qa/admin/moderate', {
      method: 'POST',
      body: JSON.stringify({ kind, id, status, replyText: replyDrafts[id] || undefined }),
    });
    if (ok) {
      onNotice?.('success', status === 'approved' ? 'تایید و در صفحه محصول منتشر شد.' : 'رد شد.');
      void loadAll();
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
          <Star className="w-4 h-4" />
          <span>دیدگاه‌ها، امتیازدهی ستاره‌ای و پرسش و پاسخ محصولات (mod_reviews_qa)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          تایید دیدگاه‌های خریداران (با برچسب خریدار واقعی و کپچای آفلاین) و پاسخ به پرسش‌ها
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <h3 className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
            دیدگاه‌های ثبت‌شده ({reviews.length.toLocaleString('fa-IR')})
          </h3>
          {reviews.length === 0 ? (
            <p className="text-xs text-stone-400">هنوز دیدگاهی ثبت نشده است.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold flex items-center gap-2">
                    <span>{r.author_name}</span>
                    {r.verified_buyer === 1 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 text-[10px]">
                        خریدار تاییدشده
                      </span>
                    )}
                  </div>
                  <span className="text-amber-500 font-black">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-300">{r.comment_text}</p>
                <input
                  type="text"
                  value={replyDrafts[r.id] ?? r.admin_reply ?? ''}
                  onChange={(e) => setReplyDrafts((p) => ({ ...p, [r.id]: e.target.value }))}
                  placeholder="پاسخ مدیر به این دیدگاه..."
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleModerate('review', r.id, 'approved')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> تایید و انتشار
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleModerate('review', r.id, 'rejected')}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> رد دیدگاه
                  </button>
                  <span className="mr-auto text-[10px] text-stone-400">{r.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <h3 className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <MessageSquareText className="w-4 h-4 text-[#1D4ED8]" />
            <span>پرسش و پاسخ محصولات ({questions.length.toLocaleString('fa-IR')})</span>
          </h3>
          {questions.length === 0 ? (
            <p className="text-xs text-stone-400">هنوز پرسشی ثبت نشده است.</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                <div className="font-extrabold">{q.author_name}</div>
                <p className="text-stone-600 dark:text-stone-300">{q.question_text}</p>
                <input
                  type="text"
                  value={replyDrafts[q.id] ?? q.answer_text ?? ''}
                  onChange={(e) => setReplyDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="پاسخ کارشناس..."
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleModerate('qa', q.id, 'approved')}
                    className="px-3 py-1 rounded-lg bg-[#1D4ED8] text-white text-[11px] font-extrabold cursor-pointer"
                  >
                    انتشار پاسخ
                  </button>
                  <span className="mr-auto text-[10px] text-stone-400">{q.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
