import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

export interface AgentTaskItem {
  id: string;
  title_fa: string;
  task_type: string;
  schedule_cron: string;
  status: string;
  last_run_at: string;
  last_result_summary: string;
}

export const AiScheduledTasksCard: React.FC<{
  tasks: AgentTaskItem[];
  onRefresh: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ tasks, onRefresh, onNotice }) => {
  const [runningTaskId, setRunningTaskId] = useState('');

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        `/api/v1/modules/ai-hub/agent/tasks/${encodeURIComponent(taskId)}/run`,
        { method: 'POST' }
      );
      if (ok) {
        onNotice?.('success', 'تسک با موفقیت اجرا و خروجی آن در صف تایید ۱-کلیکی ثبت شد.');
        onRefresh();
      } else {
        onNotice?.('error', data.error || 'خطا در اجرای تسک');
      }
    } finally {
      setRunningTaskId('');
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
        تسک‌های زمان‌بندی‌شده ۲۴/۷ ایجنت
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="font-extrabold text-stone-900 dark:text-white truncate">
                {t.title_fa}
              </div>
              <div className="text-[10.5px] text-stone-500 font-mono" dir="ltr">
                cron: {t.schedule_cron}
              </div>
              {t.last_result_summary && (
                <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 truncate">
                  {t.last_result_summary}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={runningTaskId === t.id}
              onClick={() => void handleRunTask(t.id)}
              className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{runningTaskId === t.id ? '...' : 'اجرا'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
