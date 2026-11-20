import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Inbox,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface FormFieldDef {
  id: string;
  label: string;
  type: 'text' | 'phone' | 'national_id' | 'province_city' | 'number' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
}

interface FormDefinitionItem {
  id: string;
  slug: string;
  titleFa: string;
  steps: Array<{
    title?: string;
    fields?: Array<string | FormFieldDef>;
  }>;
  pricingFormula: string;
  honeypotEnabled: boolean;
  smsNotifyEnabled: boolean;
  paymentGatewayLinked: boolean;
  submissionsCount: number;
  updatedAt: string;
}

interface FormSubmissionItem {
  id: string;
  formId: string;
  submitterPhone: string;
  submitterNationalId: string;
  provinceCity: string;
  calculatedPrice: number;
  payload: Record<string, unknown>;
  createdAt: string;
}

const IRAN_PROVINCES: Record<string, string[]> = {
  تهران: ['تهران', 'کرج', 'شهریار', 'اسلامشهر', 'پردیس'],
  اصفهان: ['اصفهان', 'کاشان', 'نجف‌آباد', 'شاهین‌شهر'],
  فارس: ['شیراز', 'مرودشت', 'جهرم', 'لار'],
  'خراسان رضوی': ['مشهد', 'نیشابور', 'سبزوار'],
  'آذربایجان شرقی': ['تبریز', 'مراغه', 'مرند'],
  مازندران: ['ساری', 'بابل', 'آمل', 'قائم‌شهر'],
};

function validateIranianNationalId(code: string): boolean {
  const clean = code.replace(/\D/g, '');
  if (!/^\d{10}$/.test(clean) || /^(\d)\1{9}$/.test(clean)) return false;
  const check = Number(clean[9]);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(clean[i]) * (10 - i);
  }
  const rem = sum % 11;
  return rem < 2 ? check === rem : check === 11 - rem;
}

function normalizeFields(form: FormDefinitionItem): FormFieldDef[] {
  const out: FormFieldDef[] = [];
  if (Array.isArray(form.steps)) {
    for (const step of form.steps) {
      if (Array.isArray(step?.fields)) {
        for (let idx = 0; idx < step.fields.length; idx += 1) {
          const f = step.fields[idx];
          if (typeof f === 'string') {
            out.push({
              id: `f_${out.length + 1}`,
              label: f,
              type: f.includes('موبایل') ? 'phone' : f.includes('ملی') ? 'national_id' : 'text',
              required: true,
            });
          } else if (f && typeof f === 'object') {
            out.push({
              id: String(f.id || `f_${out.length + 1}`),
              label: String(f.label || 'فیلد فرم'),
              type: f.type || 'text',
              required: Boolean(f.required),
              placeholder: f.placeholder || '',
            });
          }
        }
      }
    }
  }
  if (out.length === 0) {
    return [
      { id: 'full_name', label: 'نام و نام خانوادگی', type: 'text', required: true },
      { id: 'phone', label: 'شماره موبایل', type: 'phone', required: true },
      { id: 'national_id', label: 'کد ملی ۱۰ رقمی', type: 'national_id', required: false },
      { id: 'province_city', label: 'استان و شهر', type: 'province_city', required: false },
      { id: 'notes', label: 'توضیحات درخواست', type: 'textarea', required: false },
    ];
  }
  return out;
}

type ManagerView = 'list' | 'builder' | 'inbox' | 'preview';

export const FormsManagerPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [view, setView] = useState<ManagerView>('list');
  const [forms, setForms] = useState<FormDefinitionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected form for Inbox or Preview
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [inboxSubmissions, setInboxSubmissions] = useState<FormSubmissionItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // Form Builder State (Create or Edit)
  const [editingId, setEditingId] = useState<string>('');
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderSlug, setBuilderSlug] = useState('');
  const [builderFormula, setBuilderFormula] = useState('base_price + (team_size * 450000)');
  const [builderHoneypot, setBuilderHoneypot] = useState(true);
  const [builderSmsNotify, setBuilderSmsNotify] = useState(true);
  const [builderFields, setBuilderFields] = useState<FormFieldDef[]>([
    { id: 'full_name', label: 'نام و نام خانوادگی', type: 'text', required: true },
    { id: 'phone', label: 'شماره موبایل', type: 'phone', required: true },
    { id: 'national_id', label: 'کد ملی ۱۰ رقمی', type: 'national_id', required: false },
    { id: 'province_city', label: 'استان و شهر', type: 'province_city', required: false },
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldDef['type']>('text');
  const [savingForm, setSavingForm] = useState(false);

  // Interactive Preview / Test Submission State
  const [previewPhone, setPreviewPhone] = useState('09123456789');
  const [previewNationalId, setPreviewNationalId] = useState('0013542419');
  const [previewProvince, setPreviewProvince] = useState('تهران');
  const [previewCity, setPreviewCity] = useState('تهران');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewTeamSize, setPreviewTeamSize] = useState(5);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);

  const selectedForm = forms.find((f) => f.id === selectedFormId) || forms[0] || null;

  const loadForms = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{ forms?: FormDefinitionItem[] }>(
        '/api/v1/modules/forms'
      );
      if (ok && Array.isArray(data.forms)) {
        setForms(data.forms);
        if (!selectedFormId && data.forms[0]) {
          setSelectedFormId(data.forms[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPerFormInbox = async (formId: string) => {
    if (!formId) return;
    setInboxLoading(true);
    try {
      const { ok, data } = await apiJson<{ submissions?: FormSubmissionItem[] }>(
        `/api/v1/modules/forms/${encodeURIComponent(formId)}/submissions`
      );
      if (ok) {
        setInboxSubmissions(data.submissions || []);
      }
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    void loadForms();
  }, []);

  useEffect(() => {
    if (view === 'inbox' && selectedFormId) {
      void loadPerFormInbox(selectedFormId);
    }
  }, [view, selectedFormId]);

  const openCreateForm = () => {
    setEditingId('');
    setBuilderTitle('');
    setBuilderSlug('');
    setBuilderFormula('base_price + (team_size * 450000)');
    setBuilderHoneypot(true);
    setBuilderSmsNotify(true);
    setBuilderFields([
      { id: 'full_name', label: 'نام و نام خانوادگی', type: 'text', required: true },
      { id: 'phone', label: 'شماره موبایل', type: 'phone', required: true },
      { id: 'message', label: 'شرح درخواست', type: 'textarea', required: true },
    ]);
    setView('builder');
  };

  const openEditForm = (form: FormDefinitionItem) => {
    setEditingId(form.id);
    setBuilderTitle(form.titleFa);
    setBuilderSlug(form.slug);
    setBuilderFormula(form.pricingFormula || '');
    setBuilderHoneypot(form.honeypotEnabled);
    setBuilderSmsNotify(form.smsNotifyEnabled);
    setBuilderFields(normalizeFields(form));
    setView('builder');
  };

  const openFormInbox = (formId: string) => {
    setSelectedFormId(formId);
    setView('inbox');
    void loadPerFormInbox(formId);
  };

  const openFormPreview = (formId: string) => {
    setSelectedFormId(formId);
    setPreviewValues({});
    setView('preview');
  };

  const handleAddField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    setBuilderFields((prev) => [
      ...prev,
      {
        id: `field_${Date.now()}`,
        label,
        type: newFieldType,
        required: false,
      },
    ]);
    setNewFieldLabel('');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim()) {
      onNotice?.('error', 'عنوان فارسی فرم الزامی است.');
      return;
    }
    setSavingForm(true);
    try {
      const slug =
        builderSlug.trim() ||
        `form-${Date.now().toString(36)}`;
      const { ok, data } = await apiJson<{ ok?: boolean; id?: string; error?: string }>(
        '/api/v1/modules/forms',
        {
          method: 'POST',
          body: JSON.stringify({
            id: editingId || undefined,
            titleFa: builderTitle.trim(),
            slug,
            steps: [{ title: 'فیلدهای اصلی فرم', fields: builderFields }],
            conditionalLogic: [],
            pricingFormula: builderFormula,
            honeypotEnabled: builderHoneypot,
            smsNotifyEnabled: builderSmsNotify,
            paymentGatewayLinked: false,
          }),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ذخیره فرم');
        return;
      }
      onNotice?.(
        'success',
        editingId
          ? `فرم «${builderTitle.trim()}» با موفقیت ویرایش شد.`
          : `فرم جدید «${builderTitle.trim()}» با موفقیت ساخته شد.`
      );
      await loadForms();
      if (data.id) setSelectedFormId(data.id);
      setView('list');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteForm = async (form: FormDefinitionItem) => {
    const { ok, data } = await apiJson<{ error?: string }>(
      `/api/v1/modules/forms/${encodeURIComponent(form.id)}`,
      { method: 'DELETE' }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در حذف فرم');
      return;
    }
    onNotice?.('success', `فرم «${form.titleFa}» و ورودی‌های مرتبط حذف شدند.`);
    if (selectedFormId === form.id) setSelectedFormId('');
    await loadForms();
  };

  const handleDeleteSubmission = async (subId: string) => {
    const { ok } = await apiJson(
      `/api/v1/modules/forms/submissions/${encodeURIComponent(subId)}`,
      { method: 'DELETE' }
    );
    if (ok) {
      onNotice?.('success', 'ورودی انتخاب‌شده از صندوق فرم حذف شد.');
      if (selectedFormId) {
        await loadPerFormInbox(selectedFormId);
        await loadForms();
      }
    }
  };

  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;
    const fields = normalizeFields(selectedForm);
    const hasNationalId = fields.some((f) => f.type === 'national_id');
    if (hasNationalId && previewNationalId.trim() && !validateIranianNationalId(previewNationalId)) {
      onNotice?.('error', 'کد ملی واردشده با الگوریتم Modulo-11 ایران معتبر نیست.');
      return;
    }
    setPreviewSubmitting(true);
    try {
      const calcPrice = selectedForm.pricingFormula
        ? 2500000 + previewTeamSize * 450000
        : 0;
      const { ok, data } = await apiJson<{ error?: string }>(
        `/api/v1/modules/forms/${encodeURIComponent(selectedForm.id)}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            phone: previewPhone,
            nationalId: previewNationalId,
            provinceCity: `${previewProvince} - ${previewCity}`,
            calculatedPrice: calcPrice,
            payload: {
              ...previewValues,
              formTitle: selectedForm.titleFa,
              teamSize: previewTeamSize,
            },
          }),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ثبت تست فرم');
        return;
      }
      onNotice?.('success', `ورودی تستی با موفقیت در صندوق اختصاصی «${selectedForm.titleFa}» ثبت شد.`);
      await loadForms();
      openFormInbox(selectedForm.id);
    } finally {
      setPreviewSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Dedicated Header + Action Navigation */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
                مدیریت فرم‌ها و فرم‌ساز اختصاصی (Gravity-Style Form Builder)
              </h2>
              <p className="text-xs text-stone-500">
                ساخت، ویرایش و مدیریت فرم‌ها با صندوق ورودی کاملاً مجزا به تفکیک هر فرم و خروجی اکسل/CSV اختصاصی
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>ساخت فرم جدید</span>
            </button>
            <button
              type="button"
              onClick={() => void loadForms()}
              title="بروزرسانی لیست فرم‌ها"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-3.5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer ${
              view === 'list'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>لیست فرم‌ها ({forms.length.toLocaleString('fa-IR')})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedFormId && forms[0]) setSelectedFormId(forms[0].id);
              setView('inbox');
            }}
            className={`px-3.5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer ${
              view === 'inbox'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>صندوق ورودی به تفکیک هر فرم</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className={`px-3.5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer ${
              view === 'builder'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editingId ? 'ویرایش فرم انتخاب‌شده' : 'فرم‌ساز (ایجاد فرم)'}</span>
          </button>

          {selectedForm && (
            <button
              type="button"
              onClick={() => openFormPreview(selectedForm.id)}
              className={`px-3.5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer ${
                view === 'preview'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>پیش‌نمایش و ثبت تست</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ALL FORMS DIRECTORY */}
      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.length === 0 ? (
            <div className="md:col-span-2 p-10 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-center space-y-3">
              <p className="text-sm font-bold text-stone-500">هنوز هیچ فرمی ساخته نشده است.</p>
              <button
                type="button"
                onClick={openCreateForm}
                className="px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
              >
                + ساخت اولین فرم
              </button>
            </div>
          ) : (
            forms.map((form) => {
              const fieldsCount = normalizeFields(form).length;
              return (
                <div
                  key={form.id}
                  className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between gap-4 shadow-xs hover:border-[#1D4ED8]/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                          {form.titleFa}
                        </h3>
                        <div className="text-[11px] font-mono text-stone-400 mt-0.5" dir="ltr">
                          [form slug=&quot;{form.slug}&quot;]
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 text-[11px] font-extrabold smooth-nums shrink-0">
                        {form.submissionsCount.toLocaleString('fa-IR')} ورودی
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 smooth-nums">
                        {fieldsCount.toLocaleString('fa-IR')} فیلد
                      </span>
                      {form.honeypotEnabled && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          ضداسپم Honeypot
                        </span>
                      )}
                      {form.smsNotifyEnabled && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          اعلان پیامکی فعال
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Per-Form Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                    <button
                      type="button"
                      onClick={() => openFormInbox(form.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>صندوق ورودی این فرم</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(form)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openFormPreview(form.id)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>تست فرم</span>
                    </button>
                    <a
                      href={`/api/v1/modules/forms/${encodeURIComponent(form.id)}/export.csv`}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1"
                      title="خروجی اکسل این فرم"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDeleteForm(form)}
                      title="حذف فرم"
                      className="mr-auto p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: FORM BUILDER (CREATE / EDIT) */}
      {view === 'builder' && (
        <form
          onSubmit={(e) => void handleSaveForm(e)}
          className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              {editingId ? 'ویرایش ساختار فرم' : 'ایجاد فرم اختصاصی جدید'}
            </h3>
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold cursor-pointer"
            >
              بازگشت به لیست فرم‌ها
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                عنوان فرم (فارسی)
              </label>
              <input
                type="text"
                required
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                placeholder="مثلاً: فرم درخواست مشاوره سازمانی"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                شناسه یکتا / نامک (Slug)
              </label>
              <input
                type="text"
                dir="ltr"
                value={builderSlug}
                onChange={(e) => setBuilderSlug(e.target.value)}
                placeholder="enterprise-consult"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                فرمول محاسبه قیمت (اختیاری)
              </label>
              <input
                type="text"
                dir="ltr"
                value={builderFormula}
                onChange={(e) => setBuilderFormula(e.target.value)}
                placeholder="base_price + (team_size * 450000)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
              />
            </div>
          </div>

          {/* Dynamic Fields Editor */}
          <div className="space-y-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
            <div className="font-extrabold text-stone-800 dark:text-stone-200">
              فیلدهای فرم ({builderFields.length.toLocaleString('fa-IR')} فیلد)
            </div>

            <div className="space-y-2">
              {builderFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-[11px] smooth-nums">
                      {(idx + 1).toLocaleString('fa-IR')}
                    </span>
                    <span className="font-extrabold text-stone-900 dark:text-white">
                      {field.label}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[#1D4ED8] text-[10px] font-mono">
                      {field.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          setBuilderFields((prev) =>
                            prev.map((item) =>
                              item.id === field.id
                                ? { ...item, required: e.target.checked }
                                : item
                            )
                          )
                        }
                        className="accent-[#1D4ED8]"
                      />
                      <span>الزامی</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setBuilderFields((prev) => prev.filter((item) => item.id !== field.id))
                      }
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="عنوان فیلد جدید (مثلاً: نام شرکت یا شماره تماس)"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as FormFieldDef['type'])}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
              >
                <option value="text">متن کوتاه</option>
                <option value="textarea">متن چندخطی</option>
                <option value="phone">شماره موبایل ایران</option>
                <option value="national_id">کد ملی ۱۰ رقمی</option>
                <option value="province_city">استان و شهر آبشاری</option>
                <option value="number">عددی</option>
                <option value="checkbox">تیک انتخابی</option>
              </select>
              <button
                type="button"
                onClick={handleAddField}
                className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-extrabold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن فیلد</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={builderHoneypot}
                onChange={(e) => setBuilderHoneypot(e.target.checked)}
                className="accent-[#1D4ED8]"
              />
              <span>فعال‌سازی فیلد ضداسپم Honeypot</span>
            </label>
            <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={builderSmsNotify}
                onChange={(e) => setBuilderSmsNotify(e.target.checked)}
                className="accent-[#1D4ED8]"
              />
              <span>ارسال پیامک اطلاع‌رسانی پس از ثبت ورودی</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="submit"
              disabled={savingForm}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingForm ? 'در حال ذخیره...' : 'ذخیره و انتشار فرم'}</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: PER-FORM SUBMISSIONS INBOX */}
      {view === 'inbox' && (
        <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-extrabold text-stone-600 dark:text-stone-300">
                صندوق ورودی اختصاصی فرم:
              </span>
              <select
                value={selectedForm?.id || ''}
                onChange={(e) => {
                  setSelectedFormId(e.target.value);
                  void loadPerFormInbox(e.target.value);
                }}
                className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-extrabold"
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titleFa} ({f.submissionsCount.toLocaleString('fa-IR')} ورودی)
                  </option>
                ))}
              </select>
            </div>

            {selectedForm && (
              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/modules/forms/${encodeURIComponent(selectedForm.id)}/export.csv`}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی CSV این فرم</span>
                </a>
                <button
                  type="button"
                  onClick={() => openFormPreview(selectedForm.id)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-extrabold cursor-pointer"
                >
                  ثبت ورودی تست
                </button>
              </div>
            )}
          </div>

          {inboxLoading ? (
            <div className="py-10 text-center text-xs text-stone-400">
              در حال بارگذاری ورودی‌های این فرم...
            </div>
          ) : inboxSubmissions.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-500">
              هنوز هیچ ورودی برای فرم «{selectedForm?.titleFa || 'انتخاب‌شده'}» ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {inboxSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-stone-900 dark:text-white" dir="ltr">
                        {sub.submitterPhone || 'بدون شماره'}
                      </span>
                      {sub.submitterNationalId && (
                        <span className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-[10px] font-mono">
                          کد ملی: {sub.submitterNationalId}
                        </span>
                      )}
                      {sub.provinceCity && (
                        <span className="text-[11px] text-stone-500">{sub.provinceCity}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.calculatedPrice > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold smooth-nums">
                          {sub.calculatedPrice.toLocaleString('fa-IR')} تومان
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteSubmission(sub.id)}
                        title="حذف این ورودی"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {sub.payload && Object.keys(sub.payload).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-800 text-[11px]">
                      {Object.entries(sub.payload).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-stone-400">{k}: </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: LIVE PREVIEW & TEST SUBMISSION */}
      {view === 'preview' && selectedForm && (
        <form
          onSubmit={(e) => void handlePreviewSubmit(e)}
          className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs text-xs max-w-2xl"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                پیش‌نمایش زنده: {selectedForm.titleFa}
              </h3>
              <p className="text-[11px] text-stone-500">
                ورودی ثبت‌شده مستقیماً در صندوق اختصاصی همین فرم ذخیره می‌شود.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold cursor-pointer"
            >
              بستن
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                شماره موبایل (ایران)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={previewPhone}
                onChange={(e) => setPreviewPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-right"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                کد ملی ۱۰ رقمی
              </label>
              <input
                type="text"
                dir="ltr"
                value={previewNationalId}
                onChange={(e) => setPreviewNationalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-right"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">استان</label>
              <select
                value={previewProvince}
                onChange={(e) => {
                  setPreviewProvince(e.target.value);
                  setPreviewCity(IRAN_PROVINCES[e.target.value]?.[0] || '');
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
              >
                {Object.keys(IRAN_PROVINCES).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">شهر</label>
              <select
                value={previewCity}
                onChange={(e) => setPreviewCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
              >
                {(IRAN_PROVINCES[previewProvince] || ['تهران']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {normalizeFields(selectedForm)
              .filter((f) => !['phone', 'national_id', 'province_city'].includes(f.type))
              .map((field) => (
                <div
                  key={field.id}
                  className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                >
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={previewValues[field.label] || ''}
                      onChange={(e) =>
                        setPreviewValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={previewValues[field.label] || ''}
                      onChange={(e) =>
                        setPreviewValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  )}
                </div>
              ))}

            {selectedForm.pricingFormula && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  تعداد کاربر / واحد برای محاسبه‌گر قیمت
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={previewTeamSize}
                  onChange={(e) => setPreviewTeamSize(Math.max(1, Number(e.target.value || 1)))}
                  className="w-36 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={previewSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer disabled:opacity-60"
          >
            {previewSubmitting ? 'در حال ثبت...' : 'ثبت ورودی تستی در صندوق همین فرم'}
          </button>
        </form>
      )}
    </div>
  );
};
