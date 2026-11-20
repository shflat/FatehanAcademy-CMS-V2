import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  Power,
  RefreshCw,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

interface SessionRow {
  id: string;
  visitor_name: string;
  visitor_phone: string;
  subject: string;
  department: string;
  status: string;
  priority?: PriorityLevel;
  unread_admin_count: number;
  last_message_preview: string;
  created_at_fa: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  sender_role: string;
  sender_name: string;
  message_text: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at_fa: string;
}

const PRIORITY_META: Record<
  PriorityLevel,
  { label: string; badgeClass: string; dotClass: string }
> = {
  urgent: {
    label: 'فوری',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-500',
  },
  high: {
    label: 'بالا',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  normal: {
    label: 'عادی',
    badgeClass: 'bg-blue-500/15 text-[#1D4ED8] dark:text-sky-300 border-blue-500/30',
    dotClass: 'bg-[#1D4ED8]',
  },
  low: {
    label: 'کم',
    badgeClass: 'bg-stone-200/80 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-300 dark:border-stone-700',
    dotClass: 'bg-stone-400',
  },
};

export const GoftinoOperatorInboxPanel: React.FC<{
  initialSessionId?: string;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ initialSessionId, onNotice }) => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string>(initialSessionId || '');
  const [messagesBySession, setMessagesBySession] = useState<Record<string, MessageRow[]>>({});
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [operatorOnline, setOperatorOnline] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  // Create New Ticket / Outbound Message Composer
  const [showCreateComposer, setShowCreateComposer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDepartment, setNewDepartment] = useState('پشتیبانی فنی و فروش');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('high');
  const [newMessage, setNewMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const loadInbox = async (sid?: string) => {
    setLoading(true);
    try {
      const q = sid ? `?sessionId=${encodeURIComponent(sid)}` : '';
      const { ok, data } = await apiJson<{
        sessions?: SessionRow[];
        activeSessionId?: string;
        messages?: MessageRow[];
        operatorConfig?: { online: boolean };
      }>(`/api/v1/modules/live-chat/admin/inbox${q}`);
      if (ok) {
        setSessions(data.sessions || []);
        if (sid && Array.isArray(data.messages)) {
          setMessagesBySession((prev) => ({ ...prev, [sid]: data.messages || [] }));
        }
        if (data.operatorConfig) setOperatorOnline(Boolean(data.operatorConfig.online));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSessionId) {
      setExpandedSessionId(initialSessionId);
      void loadInbox(initialSessionId);
    } else {
      void loadInbox();
    }
  }, [initialSessionId]);

  const filteredSessions = useMemo(() => {
    if (priorityFilter === 'all') return sessions;
    return sessions.filter((s) => (s.priority || 'normal') === priorityFilter);
  }, [sessions, priorityFilter]);

  const handleToggleRow = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId('');
      return;
    }
    setExpandedSessionId(sessionId);
    setReplyText('');
    await loadInbox(sessionId);
  };

  const handleUpdatePriority = async (
    sessionId: string,
    priority: PriorityLevel,
    status?: string
  ) => {
    const { ok } = await apiJson('/api/v1/modules/live-chat/admin/priority', {
      method: 'POST',
      body: JSON.stringify({ sessionId, priority, status }),
    });
    if (ok) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, priority, status: status || s.status } : s
        )
      );
      onNotice?.('success', `اولویت گفتگو به «${PRIORITY_META[priority].label}» تغییر یافت.`);
      void loadInbox(expandedSessionId || undefined);
    }
  };

  const handleToggleOnline = async () => {
    const next = !operatorOnline;
    const { ok } = await apiJson('/api/v1/modules/live-chat/admin/reply', {
      method: 'POST',
      body: JSON.stringify({ toggleOnline: next }),
    });
    if (ok) {
      setOperatorOnline(next);
      onNotice?.('success', next ? 'وضعیت اپراتور گفتگو: آنلاین' : 'وضعیت اپراتور گفتگو: آفلاین');
    }
  };

  const handleSendReply = async (e: React.FormEvent, sessionId: string) => {
    e.preventDefault();
    if (!sessionId || !replyText.trim()) return;
    const { ok, data } = await apiJson<{ messages?: MessageRow[] }>(
      '/api/v1/modules/live-chat/admin/reply',
      {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          messageText: replyText.trim(),
        }),
      }
    );
    if (ok) {
      setMessagesBySession((prev) => ({ ...prev, [sessionId]: data.messages || [] }));
      setReplyText('');
      onNotice?.('success', 'پاسخ اپراتور برای فرستنده ارسال شد.');
      void loadInbox(sessionId);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMessage.trim()) {
      onNotice?.('error', 'نام گیرنده و متن پیام / تیکت الزامی است.');
      return;
    }
    setCreatingTicket(true);
    try {
      const { ok, data } = await apiJson<{ sessionId?: string; error?: string }>(
        '/api/v1/modules/live-chat/admin/create-thread',
        {
          method: 'POST',
          body: JSON.stringify({
            visitorName: newName.trim(),
            visitorPhone: newPhone.trim(),
            subject: newSubject.trim() || 'پیام / تیکت پشتیبانی جدید',
            department: newDepartment,
            priority: newPriority,
            messageText: newMessage.trim(),
          }),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ایجاد پیام / تیکت');
        return;
      }
      onNotice?.('success', `پیام / تیکت جدید برای «${newName.trim()}» ایجاد و ثبت شد.`);
      setNewName('');
      setNewPhone('');
      setNewSubject('');
      setNewMessage('');
      setShowCreateComposer(false);
      if (data.sessionId) {
        setExpandedSessionId(data.sessionId);
        await loadInbox(data.sessionId);
      } else {
        await loadInbox();
      }
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const { ok } = await apiJson(
      `/api/v1/modules/live-chat/admin/session/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' }
    );
    if (ok) {
      if (expandedSessionId === sessionId) setExpandedSessionId('');
      onNotice?.('success', 'مکالمه / تیکت انتخاب‌شده حذف شد.');
      await loadInbox();
    }
  };

  const priorityCounts = useMemo(() => {
    const counts = { all: sessions.length, urgent: 0, high: 0, normal: 0, low: 0 };
    for (const s of sessions) {
      const p = (s.priority || 'normal') as PriorityLevel;
      if (p in counts) counts[p] += 1;
    }
    return counts;
  }, [sessions]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
              پیام‌ها و تیکت‌های پشتیبانی (صندوق اولویت‌دار)
            </h3>
            <p className="text-xs text-stone-500">
              مشاهده همه پیام‌ها و تیکت‌ها، ایجاد پیام/تیکت جدید، دسته‌بندی اولویت (فوری، بالا، عادی، کم) و پاسخ مستقیم
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateComposer((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {showCreateComposer ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showCreateComposer ? 'بستن فرم پیام جدید' : 'ایجاد پیام / تیکت جدید'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleToggleOnline()}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border ${
              operatorOnline
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-700 border-amber-500/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{operatorOnline ? 'اپراتور: آنلاین' : 'اپراتور: آفلاین'}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadInbox(expandedSessionId || undefined)}
            title="بروزرسانی لیست پیام‌ها"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inline Create New Message / Support Ticket Composer */}
      {showCreateComposer && (
        <form
          onSubmit={(e) => void handleCreateTicket(e)}
          className="p-5 rounded-2xl border-2 border-[#1D4ED8]/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-4 text-xs"
        >
          <div className="font-extrabold text-sm text-stone-900 dark:text-white">
            ایجاد پیام یا تیکت پشتیبانی جدید
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                نام مخاطب / کاربر *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً: علی رضایی"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                شماره موبایل (اختیاری)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="0912..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-right"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                موضوع تیکت / پیام
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="پیگیری سفارش یا پشتیبانی فنی"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">دپارتمان</label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                >
                  <option value="پشتیبانی فنی و فروش">پشتیبانی فنی</option>
                  <option value="امور مالی و فاکتور">امور مالی</option>
                  <option value="پیگیری سفارش">سفارش‌ها</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">اولویت</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                >
                  <option value="urgent">فوری</option>
                  <option value="high">بالا</option>
                  <option value="normal">عادی</option>
                  <option value="low">کم</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              متن پیام / تیکت *
            </label>
            <textarea
              rows={3}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="متن پیام یا تیکت را اینجا بنویسید..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateComposer(false)}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 font-bold cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={creatingTicket}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{creatingTicket ? 'در حال ثبت...' : 'ثبت و ارسال پیام / تیکت'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Priority Filter Bar (Wrapped, No Horizontal Scroll) */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `همه پیام‌ها (${priorityCounts.all.toLocaleString('fa-IR')})` },
            { id: 'urgent', label: `فوری (${priorityCounts.urgent.toLocaleString('fa-IR')})` },
            { id: 'high', label: `بالا (${priorityCounts.high.toLocaleString('fa-IR')})` },
            { id: 'normal', label: `عادی (${priorityCounts.normal.toLocaleString('fa-IR')})` },
            { id: 'low', label: `کم (${priorityCounts.low.toLocaleString('fa-IR')})` },
          ] as const
        ).map((tab) => {
          const active = priorityFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPriorityFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                active
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Full-Width Row-Based Conversation List */}
      <div className="space-y-2.5">
        {filteredSessions.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-500">
            هیچ پیامی در این اولویت ثبت نشده است.
          </div>
        ) : (
          filteredSessions.map((s) => {
            const pKey = ((s.priority || 'normal') in PRIORITY_META
              ? s.priority || 'normal'
              : 'normal') as PriorityLevel;
            const pMeta = PRIORITY_META[pKey];
            const isExpanded = expandedSessionId === s.id;
            const threadMessages = messagesBySession[s.id] || [];

            return (
              <div
                key={s.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-[#1D4ED8] bg-white dark:bg-stone-900 shadow-md'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Compact Full-Width Row Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleToggleRow(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleToggleRow(s.id);
                    }
                  }}
                  className="w-full p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 sm:mt-0 ${pMeta.dotClass}`}
                    />
                    <span
                      className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-extrabold shrink-0 ${pMeta.badgeClass}`}
                    >
                      {pMeta.label}
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          {s.visitor_name}
                        </span>
                        <span className="text-[11px] font-mono text-stone-500" dir="ltr">
                          {s.visitor_phone || 'کاربر مهمان'}
                        </span>
                        {s.unread_admin_count > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold smooth-nums">
                            {s.unread_admin_count.toLocaleString('fa-IR')} پیام جدید
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                        {s.last_message_preview || s.subject || 'گفتگوی جدید'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-stone-400 flex items-center gap-1 smooth-nums">
                      <Clock className="w-3 h-3" />
                      {s.created_at_fa}
                    </span>

                    <select
                      aria-label="تغییر اولویت پیام"
                      value={pKey}
                      onChange={(e) =>
                        void handleUpdatePriority(s.id, e.target.value as PriorityLevel)
                      }
                      className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px] font-bold"
                    >
                      <option value="urgent">اولویت: فوری</option>
                      <option value="high">اولویت: بالا</option>
                      <option value="normal">اولویت: عادی</option>
                      <option value="low">اولویت: کم</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => void handleToggleRow(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'بستن مکالمه' : 'مشاهده و پاسخ'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Full Thread & Operator Reply Panel */}
                {isExpanded && (
                  <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300 font-bold">
                        <AlertCircle className="w-4 h-4 text-[#1D4ED8]" />
                        <span>
                          تاریخچه کامل پیام‌های «{s.visitor_name}» ({threadMessages.length.toLocaleString('fa-IR')} پیام)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdatePriority(
                              s.id,
                              pKey,
                              s.status === 'resolved' ? 'open' : 'resolved'
                            )
                          }
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                            s.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {s.status === 'resolved'
                            ? 'بسته‌شده (بازگشایی مجدد)'
                            : 'علامت‌گذاری به عنوان حل‌شده'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSession(s.id)}
                          title="حذف گفتگو / تیکت"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      {threadMessages.length === 0 ? (
                        <div className="py-8 text-center text-xs text-stone-400">
                          در حال بارگذاری پیام‌های این گفتگو...
                        </div>
                      ) : (
                        threadMessages.map((m) => {
                          const isOperator = m.sender_role === 'operator';
                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isOperator ? 'items-start' : 'items-end'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs space-y-1 leading-relaxed ${
                                  isOperator
                                    ? 'bg-[#1D4ED8] text-white'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700'
                                }`}
                              >
                                <div className="text-[10px] font-extrabold opacity-80">
                                  {m.sender_name}
                                </div>
                                <p className="whitespace-pre-wrap">{m.message_text}</p>
                                {m.attachment_url && (
                                  <a
                                    href={m.attachment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block underline text-[11px] font-bold pt-1"
                                  >
                                    مشاهده فایل پیوست ({m.attachment_name || 'پیوست'})
                                  </a>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 mt-1">
                                {m.created_at_fa}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      onSubmit={(e) => void handleSendReply(e, s.id)}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`پاسخ سریع اپراتور به ${s.visitor_name}...`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>ارسال پاسخ</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
