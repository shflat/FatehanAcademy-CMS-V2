import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Paperclip, Send, ShieldCheck, X, Zap } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import type { UserRoleType } from '../../src/core/types';
import { ChatInlineOtpCard } from './ChatInlineOtpCard';

interface ChatMessageRecord {
  id: string;
  sender_role: 'visitor' | 'operator';
  sender_name: string;
  message_text: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at_fa: string;
}

function getOrCreateVisitorSessionId(): string {
  try {
    const existing = localStorage.getItem('skill98_livechat_sid');
    if (existing && existing !== 'chat_sess_1405_01') return existing;
    const fresh = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('skill98_livechat_sid', fresh);
    return fresh;
  } catch {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const GoftinoLiveChatWidget: React.FC<{
  loggedInName?: string | null;
  loggedInPhone?: string;
  onInlineLoginSuccess?: (
    role: Exclude<UserRoleType, 'guest'>,
    verifiedPhone: string,
    customDisplayName?: string,
    assignedRoleId?: string,
    sessionToken?: string
  ) => void;
  onDisplayNameUpdated?: (newName: string) => void;
}> = ({ loggedInName, loggedInPhone, onInlineLoginSuccess, onDisplayNameUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(getOrCreateVisitorSessionId);
  const [visitorName, setVisitorName] = useState(loggedInName || 'کاربر اسکیل ۹۸');
  const [visitorPhone, setVisitorPhone] = useState(loggedInPhone || '');
  const [requestUrgent, setRequestUrgent] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [operatorOnline, setOperatorOnline] = useState(true);
  const [operatorTitle, setOperatorTitle] = useState('پشتیبانی آنلاین اسکیل ۹۸ (گفتینو بومی)');
  const [sending, setSending] = useState(false);

  const isAuthenticated = Boolean(loggedInPhone);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSeenOperatorCountRef = useRef(0);

  useEffect(() => {
    if (loggedInName) setVisitorName(loggedInName);
    if (loggedInPhone) setVisitorPhone(loggedInPhone);
  }, [loggedInName, loggedInPhone]);

  const loadChatStatus = useCallback(
    async (sid: string) => {
      const { ok, data } = await apiJson<{
        operatorConfig?: { online: boolean; operatorTitle: string };
        messages?: ChatMessageRecord[];
        sessionPriority?: string;
      }>(`/api/v1/modules/live-chat/status?sessionId=${encodeURIComponent(sid)}`);
      if (!ok) return;
      if (data.operatorConfig) {
        setOperatorOnline(Boolean(data.operatorConfig.online));
        setOperatorTitle(data.operatorConfig.operatorTitle);
      }
      if (data.sessionPriority === 'urgent' && isAuthenticated) {
        setRequestUrgent(true);
      }
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        const opCount = data.messages.filter((m) => m.sender_role === 'operator').length;
        if (isOpen) {
          lastSeenOperatorCountRef.current = opCount;
          setUnreadCount(0);
        } else if (opCount > lastSeenOperatorCountRef.current) {
          setUnreadCount(opCount - lastSeenOperatorCountRef.current);
        }
      }
    },
    [isOpen, isAuthenticated]
  );

  // Active 3.5s polling while open; lightweight 15s unread check while closed
  useEffect(() => {
    void loadChatStatus(sessionId);
    const intervalMs = isOpen ? 3500 : 15000;
    const timer = setInterval(() => {
      void loadChatStatus(sessionId);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isOpen, sessionId, loadChatStatus]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
    lastSeenOperatorCountRef.current = messages.filter((m) => m.sender_role === 'operator').length;
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result || '');
      const { ok, data } = await apiJson<{ item?: { url: string } }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          title: `پیوست چت: ${file.name}`,
          fileName: file.name,
          dataUrl: base64,
          categoryLabel: 'پیوست گفتگوی آنلاین',
        }),
      });
      if (ok && data.item?.url) {
        setAttachmentUrl(data.item.url);
        setAttachmentName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachmentUrl) return;
    setSending(true);
    try {
      const { ok, data } = await apiJson<{
        sessionId?: string;
        messages?: ChatMessageRecord[];
        updatedDisplayName?: string;
      }>('/api/v1/modules/live-chat/visitor-message', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          visitorName: loggedInName || visitorName || 'بازدیدکننده',
          visitorPhone: loggedInPhone || visitorPhone,
          requestUrgent: isAuthenticated && requestUrgent,
          messageText: messageInput.trim(),
          attachmentUrl,
          attachmentName,
        }),
      });
      if (ok) {
        if (data.sessionId) {
          setSessionId(data.sessionId);
          try {
            localStorage.setItem('skill98_livechat_sid', data.sessionId);
          } catch {
            // ignore
          }
        }
        if (data.updatedDisplayName) {
          setVisitorName(data.updatedDisplayName);
          onDisplayNameUpdated?.(data.updatedDisplayName);
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        setMessageInput('');
        setAttachmentUrl('');
        setAttachmentName('');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[68px] md:bottom-5 right-3 sm:right-6 z-40">
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpenChat}
          aria-label="گفتگوی آنلاین پشتیبانی"
          title="گفتگوی آنلاین پشتیبانی"
          className="group relative flex items-center justify-center h-[44px] min-w-[44px] px-[11px] md:h-[52px] md:min-w-[52px] md:px-[14px] md:hover:px-4 rounded-full bg-[#1D4ED8]/95 hover:bg-blue-700 text-white shadow-[0_8px_22px_-4px_rgba(29,78,216,0.48)] border border-white/25 backdrop-blur-md cursor-pointer transition-all duration-300 ease-out"
        >
          <span className="relative flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 md:w-[22px] md:h-[22px] transition-transform duration-300 group-hover:scale-105" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 md:h-3 md:w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                  operatorOnline ? 'bg-emerald-300' : 'bg-amber-300'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 ring-2 ring-[#1D4ED8] ${
                  operatorOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </span>
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm smooth-nums">
              {unreadCount.toLocaleString('fa-IR')}
            </span>
          )}

          <span className="hidden md:inline-block overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[190px] group-hover:opacity-100 group-hover:mr-2.5 text-xs font-extrabold transition-all duration-300 ease-out">
            گفتگوی آنلاین پشتیبانی
          </span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[380px] rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-gradient-to-l from-[#1E3A8A] to-[#1D4ED8] text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{operatorTitle}</span>
              </div>
              <div className="text-[10px] text-blue-100 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    operatorOnline ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {operatorOnline
                    ? 'اپراتور آنلاین • همگام‌سازی زنده بومی'
                    : 'خارج از ساعت اداری • ثبت تیکت فوری'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isAuthenticated ? (
            <ChatInlineOtpCard
              sessionId={sessionId}
              onVerifiedLogin={(role, phone, displayName, roleId, token) => {
                setVisitorPhone(phone);
                if (displayName) setVisitorName(displayName);
                setRequestUrgent(true);
                onInlineLoginSuccess?.(role, phone, displayName, roleId, token);
              }}
              onSessionLinked={(linkedMsgs) => {
                if (Array.isArray(linkedMsgs)) {
                  setMessages(linkedMsgs as ChatMessageRecord[]);
                }
                setRequestUrgent(true);
              }}
            />
          ) : (
            <div className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200/70 dark:border-emerald-900 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
                {loggedInName || visitorName} ({loggedInPhone})
              </span>
              <button
                type="button"
                onClick={() => setRequestUrgent((prev) => !prev)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                  requestUrgent
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-300 dark:border-slate-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{requestUrgent ? 'اولویت فوری فعال' : 'فعال‌سازی فوری'}</span>
              </button>
            </div>
          )}

          <div
            ref={listRef}
            className="h-64 overflow-y-auto p-3.5 space-y-2.5 bg-stone-50/60 dark:bg-slate-950/60"
          >
            {messages.length === 0 ? (
              <div className="text-center text-xs text-stone-400 py-10">
                سلام! سوال یا درخواست خود را بنویسید تا اپراتور به صورت زنده پاسخ دهد.
              </div>
            ) : (
              messages.map((m) => {
                const isOperator = m.sender_role === 'operator';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOperator ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs space-y-1 ${
                        isOperator
                          ? 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-100'
                          : 'bg-[#1D4ED8] text-white'
                      }`}
                    >
                      <div className="text-[10px] font-extrabold opacity-75">{m.sender_name}</div>
                      {m.message_text && <p className="leading-relaxed">{m.message_text}</p>}
                      {m.attachment_url && (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-[11px] underline font-bold"
                        >
                          مشاهده فایل پیوست ({m.attachment_name || 'تصویر'})
                        </a>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-400 mt-0.5 px-1">{m.created_at_fa}</span>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(e) => void handleSendMessage(e)}
            className="p-2.5 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
          >
            {attachmentName && (
              <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-between px-2">
                <span>پیوست آماده ارسال: {attachmentName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl('');
                    setAttachmentName('');
                  }}
                  className="text-rose-500 cursor-pointer"
                >
                  حذف
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <label className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer text-stone-500">
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleUploadAttachment(e)}
                  className="hidden"
                />
              </label>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="پیام خود را بنویسید..."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="submit"
                disabled={sending}
                className="p-2 rounded-xl bg-[#1D4ED8] text-white hover:bg-blue-800 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
