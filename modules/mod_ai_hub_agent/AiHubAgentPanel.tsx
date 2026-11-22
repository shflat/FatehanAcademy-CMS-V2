import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Crown,
  Image as ImageIcon,
  Lock,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { AiSlotsConfigCard, type AiSlotItem } from './AiSlotsConfigCard';
import { AiCommandCenterCard } from './AiCommandCenterCard';
import { AiSkillsApprovalsCard } from './AiSkillsApprovalsCard';
import { AiImageStudioWidget } from './AiImageStudioWidget';
import { AiKnowledgeCacheCard } from './AiKnowledgeCacheCard';
import {
  DEFAULT_JARVIS_UI_SETTINGS,
  type JarvisSettingsUiConfig,
} from './AiJarvisSettingsCard';

type HubTab = 'slots' | 'command' | 'skills' | 'knowledge' | 'approvals' | 'studio';

export const AiHubAgentPanel: React.FC<{
  isSuperAdmin: boolean;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ isSuperAdmin, onNotice }) => {
  const [tab, setTab] = useState<HubTab>('slots');
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AiSlotItem[]>([]);
  const [serverIsSuperAdmin, setServerIsSuperAdmin] = useState(isSuperAdmin);
  const [settings, setSettings] = useState<{
    agentMode: 'light' | 'autonomous_24_7';
    liveChatAutoReply: boolean;
    autoProfileCompletion: boolean;
    botBridgeEnabled: boolean;
    baleAlerts?: {
      enabled: boolean;
      notifyApprovals: boolean;
      notifyUserRequests: boolean;
      notifyOrdersAndFailures: boolean;
      notifyCriticalErrors: boolean;
      notifyAgentEscalations: boolean;
      overrideChatId: string;
      baleBotTokenMasked?: string;
      hasDirectBaleBotToken?: boolean;
      dailyBriefingEnabled?: boolean;
      dailyBriefingTime?: string;
      lastBriefingDate?: string;
    };
    jarvisSettings?: JarvisSettingsUiConfig;
  }>({
    agentMode: 'light',
    liveChatAutoReply: true,
    autoProfileCompletion: true,
    botBridgeEnabled: false,
    baleAlerts: {
      enabled: true,
      notifyApprovals: true,
      notifyUserRequests: true,
      notifyOrdersAndFailures: true,
      notifyCriticalErrors: true,
      notifyAgentEscalations: true,
      overrideChatId: '',
      baleBotTokenMasked: '',
      hasDirectBaleBotToken: false,
      dailyBriefingEnabled: false,
      dailyBriefingTime: '09:00',
      lastBriefingDate: '',
    },
    jarvisSettings: DEFAULT_JARVIS_UI_SETTINGS,
  });
  const [skills, setSkills] = useState<
    {
      id: string;
      slug: string;
      title_fa: string;
      category: string;
      skill_markdown: string;
      source_type?: string;
      enabled?: number;
      updated_at: string;
    }[]
  >([]);
  const [tasks, setTasks] = useState<
    { id: string; title_fa: string; task_type: string; schedule_cron: string; status: string; last_run_at: string; last_result_summary: string }[]
  >([]);
  const [approvals, setApprovals] = useState<
    { id: string; title_fa: string; action_type: string; summary_fa: string; status: string; reviewed_by: string; created_at_fa: string }[]
  >([]);
  const [conversations, setConversations] = useState<
    { id: string; channel: string; role: string; message_text: string; tool_calls_json?: string; created_at_fa: string }[]
  >([]);
  const [kbPendingCount, setKbPendingCount] = useState<number>(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const cfgRes = await apiJson<{
        ok?: boolean;
        isSuperAdmin?: boolean;
        slots?: AiSlotItem[];
        settings?: typeof settings;
      }>('/api/v1/modules/ai-hub/config');
      if (cfgRes.ok) {
        setSlots(cfgRes.data.slots || []);
        const effectiveSuper = Boolean(cfgRes.data.isSuperAdmin);
        setServerIsSuperAdmin(effectiveSuper);
        if (cfgRes.data.settings) {
          setSettings((prev) => ({ ...prev, ...cfgRes.data.settings }));
        }
        if (effectiveSuper) {
          const agRes = await apiJson<{
            ok?: boolean;
            settings?: typeof settings;
            skills?: typeof skills;
            tasks?: typeof tasks;
            approvals?: typeof approvals;
            conversations?: typeof conversations;
            kbStats?: { pendingCount?: number };
          }>('/api/v1/modules/ai-hub/agent/overview');
          if (agRes.ok) {
            if (agRes.data.settings) setSettings(agRes.data.settings);
            setSkills(agRes.data.skills || []);
            setTasks(agRes.data.tasks || []);
            setApprovals(agRes.data.approvals || []);
            setConversations(agRes.data.conversations || []);
            setKbPendingCount(Number(agRes.data.kbStats?.pendingCount || 0));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const effectiveSuper = isSuperAdmin && serverIsSuperAdmin;
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const tabs: { id: HubTab; label: string; icon: React.ReactNode; superOnly?: boolean; badge?: number }[] = [
    { id: 'slots', label: '۴ اسلات موتور هوش مصنوعی', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'studio', label: 'استودیو پرامپت و تصویر', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'command', label: 'مرکز فرماندهی ۲۴/۷ و ویس', icon: <Bot className="w-3.5 h-3.5" />, superOnly: true },
    { id: 'skills', label: 'حافظه SKILL.md', icon: <BookOpen className="w-3.5 h-3.5" />, superOnly: true },
    { id: 'knowledge', label: 'بانک دانش صفرتوکن', icon: <Zap className="w-3.5 h-3.5" />, superOnly: true, badge: kbPendingCount },
    { id: 'approvals', label: 'صف تایید ۱-کلیکی', icon: <CheckCircle2 className="w-3.5 h-3.5" />, superOnly: true, badge: pendingCount },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                هاب یکپارچه هوش مصنوعی و ایجنت خودکار ۲۴/۷ (`mod_ai_hub_agent`)
              </h3>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 ${
                  effectiveSuper
                    ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
                    : 'bg-blue-500/15 text-[#1D4ED8] dark:text-sky-300'
                }`}
              >
                {effectiveSuper ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{effectiveSuper ? 'سوپر ادمین (دسترسی کامل ۲۴/۷)' : 'ادمین سایت (حالت سبک)'}</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              مسیریابی ۴ اسلات مجزا (متن/سئو، تصویر، ایجنت ۲۴/۷ و صوت/ویس Whisper)، رمزنگاری AES-256-GCM، حافظه SKILL.md و ایجنت چت هوشمند
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const locked = Boolean(t.superOnly && !effectiveSuper);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (locked) {
                  onNotice?.('error', 'دسترسی به بخش‌های ایجنت ۲۴/۷ فقط برای سوپر ادمین مجاز است (HTTP 403).');
                  return;
                }
                setTab(t.id);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                active
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : locked
                  ? 'bg-stone-100 dark:bg-stone-900 text-stone-400 border border-dashed border-stone-300 dark:border-stone-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {locked ? <Lock className="w-3.5 h-3.5" /> : t.icon}
              <span>{t.label}</span>
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white text-[10px]">
                  {t.badge.toLocaleString('fa-IR')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {tab === 'slots' && (
        <AiSlotsConfigCard
          key={slots.map((s) => `${s.slotKey}:${s.apiKeyMasked}`).join('|')}
          slots={slots}
          isSuperAdmin={effectiveSuper}
          onSaved={() => void loadAll()}
          onNotice={onNotice}
        />
      )}

      {tab === 'studio' && (
        <AiImageStudioWidget title="" category="فروشگاه و مجله" onNotice={onNotice} />
      )}

      {tab === 'command' && effectiveSuper && (
        <AiCommandCenterCard
          agentMode={settings.agentMode}
          liveChatAutoReply={settings.liveChatAutoReply}
          autoProfileCompletion={settings.autoProfileCompletion}
          botBridgeEnabled={settings.botBridgeEnabled}
          baleAlerts={settings.baleAlerts}
          jarvisSettings={settings.jarvisSettings}
          tasks={tasks}
          conversations={conversations}
          onRefresh={() => void loadAll()}
          onNotice={onNotice}
        />
      )}

      {(tab === 'skills' || tab === 'approvals') && effectiveSuper && (
        <AiSkillsApprovalsCard
          mode={tab}
          skills={skills}
          approvals={approvals}
          onRefresh={() => void loadAll()}
          onNotice={onNotice}
        />
      )}

      {tab === 'knowledge' && effectiveSuper && (
        <AiKnowledgeCacheCard onRefreshParent={() => void loadAll()} onNotice={onNotice} />
      )}
    </div>
  );
};
