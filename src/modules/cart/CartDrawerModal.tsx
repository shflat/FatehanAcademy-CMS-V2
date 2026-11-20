import React, { useEffect, useMemo, useState } from 'react';
import {
  Check, CreditCard, FileText, Lock, MapPin, Minus, Phone, Plus,
  ShoppingBag, Sparkles, Tag, Truck, X, Zap,
} from 'lucide-react';
import type {
  ActiveTab, CartItem, CouponRule, PaymentGatewayId, PaymentGatewayOption, UserRoleType,
} from '../../core/types';
import type { AccentStyleTokens } from '../../theme/accentStyles';
import {
  IRAN_PROVINCES_AND_CITIES as IRAN_PROVINCES,
  getCitiesByProvince,
  isValidIranMobile as validateIranMobile,
  isValidIranNationalId as validateIranNationalId,
  isValidIranPostalCode as validateIranPostalCode,
} from '../../core/iran-geo';
import { apiJson } from '../../core/apiClient';

interface CartDrawerModalProps {
  activeTab: ActiveTab;
  isCartOpen: boolean;
  isLoggedIn: boolean;
  loggedInPhone?: string;
  loggedInName?: string | null;
  cart: CartItem[];
  cartTotalItems: number;
  cartSubtotalAmount: number;
  discountAmount: number;
  cartFinalPayable: number;
  coupons: CouponRule[];
  couponInput: string;
  appliedCoupon: CouponRule | null;
  couponMessage: { type: 'success' | 'error'; text: string } | null;
  activeGateways: PaymentGatewayOption[];
  selectedGatewayId: PaymentGatewayId;
  accentStyles: AccentStyleTokens;
  onOpenCart: () => void;
  onCloseCart: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onCouponInputChange: (val: string) => void;
  onApplyCoupon: (codeToApply?: string) => void;
  onClearCoupon: () => void;
  onSelectGateway: (gwId: PaymentGatewayId) => void;
  onCompleteCheckout: () => void;
  onInlineLoginSuccess?: (
    role: Exclude<UserRoleType, 'guest'>,
    phone: string,
    fullName?: string,
    roleId?: string,
    sessionToken?: string
  ) => void;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({
  activeTab, isCartOpen, isLoggedIn, loggedInPhone, loggedInName,
  cart, cartTotalItems, cartSubtotalAmount, discountAmount, cartFinalPayable,
  coupons, couponInput, appliedCoupon, couponMessage,
  activeGateways, selectedGatewayId, accentStyles,
  onOpenCart, onCloseCart, onUpdateQty, onCouponInputChange,
  onApplyCoupon, onClearCoupon, onSelectGateway, onCompleteCheckout, onInlineLoginSuccess,
}) => {
  // Smart Digital vs Physical Detection
  const cartHasPhysicalItem = useMemo(
    () => cart.some((c) => c.product.deliveryType === 'physical'),
    [cart]
  );
  const [requestPhysicalPackage, setRequestPhysicalPackage] = useState(false);
  const requiresPhysicalShipping = cartHasPhysicalItem || requestPhysicalPackage;

  // Iranian Shipping Fields
  const [provinceId, setProvinceId] = useState('tehran');
  const availableCities = useMemo(() => getCitiesByProvince(provinceId), [provinceId]);
  const [cityName, setCityName] = useState('تهران');
  const [postalCode, setPostalCode] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Payment Split Tab & Invoice Kind
  const [paymentPlanTab, setPaymentPlanTab] = useState<'cash_shaparak' | 'bnpl_4x'>('cash_shaparak');
  const [invoiceKind, setInvoiceKind] = useState<'standard' | 'official_tax'>('standard');

  // Inline Drawer OTP Authentication State
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineName, setInlineName] = useState('');
  const [inlineOtp, setInlineOtp] = useState('');
  const [inlineOtpSent, setInlineOtpSent] = useState(false);
  const [inlineIsMasterCode, setInlineIsMasterCode] = useState(false);
  const [inlineAuthBusy, setInlineAuthBusy] = useState(false);
  const [inlineAuthError, setInlineAuthError] = useState<string | null>(null);
  const [stockReservedLabel, setStockReservedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isCartOpen || cart.length === 0) return;
    let active = true;
    void apiJson<{ ok?: boolean; expiresAt?: string }>('/api/v1/modules/inventory/reserve', {
      method: 'POST',
      body: JSON.stringify({
        sessionKey: loggedInPhone || 'guest-drawer-session',
        ttlMinutes: 10,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
      }),
    }).then(({ ok }) => {
      if (active && ok) {
        setStockReservedLabel('رزرو موقت موجودی سبد (۱۰ دقیقه فعال)');
      }
    });
    return () => {
      active = false;
    };
  }, [isCartOpen, cart, loggedInPhone]);

  const bnplPerInstallment = Math.ceil(cartFinalPayable / 4);

  const handleSendInlineOtp = async () => {
    setInlineAuthError(null);
    if (!validateIranMobile(inlinePhone)) {
      setInlineAuthError('شماره موبایل معتبر وارد کنید (مثال: 09123456789).');
      return;
    }
    setInlineAuthBusy(true);
    try {
      const checkRes = await apiJson<{ requiresMasterCode?: boolean }>('/api/auth/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phone: inlinePhone.trim() }),
      });
      if (checkRes.ok && checkRes.data.requiresMasterCode) {
        setInlineIsMasterCode(true);
        setInlineOtpSent(true);
        return;
      }
      setInlineIsMasterCode(false);
      const { ok, data } = await apiJson<{ error?: string }>('/api/sms/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: inlinePhone.trim() }),
      });
      if (!ok) {
        setInlineAuthError(data.error || 'خطا در ارسال کد تایید.');
        return;
      }
      setInlineOtpSent(true);
    } catch {
      setInlineAuthError('خطا در ارتباط با سرور پیامک.');
    } finally {
      setInlineAuthBusy(false);
    }
  };

  const handleVerifyInlineOtp = async () => {
    setInlineAuthError(null);
    if (inlineOtp.trim().length < 4) {
      setInlineAuthError(
        inlineIsMasterCode ? 'کد مستر امنیتی را وارد نمایید.' : 'کد تایید پیامکی را وارد نمایید.'
      );
      return;
    }
    setInlineAuthBusy(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string; role?: string; roleId?: string; displayName?: string; sessionToken?: string;
      }>('/api/sms/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: inlinePhone.trim(), code: inlineOtp.trim(), fullName: inlineName.trim() || undefined }),
      });
      if (!ok) {
        setInlineAuthError(data.error || 'کد واردشده نامعتبر است.');
        return;
      }
      const assignedRole: Exclude<UserRoleType, 'guest'> =
        data.role === 'super_admin' ? 'super_admin' : data.role === 'admin' ? 'admin' : 'customer';
      onInlineLoginSuccess?.(assignedRole, inlinePhone.trim(), inlineName.trim() || data.displayName, data.roleId, data.sessionToken);
      setInlineOtpSent(false);
      setInlineIsMasterCode(false);
    } catch {
      setInlineAuthError('خطا در تایید کد.');
    } finally {
      setInlineAuthBusy(false);
    }
  };

  const handleProceedCheckout = () => {
    setShippingError(null);
    if (requiresPhysicalShipping) {
      if (!validateIranNationalId(nationalId)) {
        setShippingError('کد ملی ۱۰ رقمی معتبر برای مرسوله پستی یا فاکتور رسمی الزامی است.');
        return;
      }
      if (!validateIranPostalCode(postalCode)) {
        setShippingError('کد پستی ۱۰ رقمی معتبر وارد نمایید.');
        return;
      }
      if (streetAddress.trim().length < 8) {
        setShippingError('آدرس دقیق پستی را وارد نمایید.');
        return;
      }
    }
    onCompleteCheckout();
  };

  return (
    <>
      {/* Floating Corner / Bottom Cart Trigger Bar */}
      {cart.length > 0 && !isCartOpen && activeTab !== 'admin' && (
        <div className="fixed bottom-[82px] md:bottom-5 left-4 right-4 md:left-6 md:right-auto z-40 pointer-events-none">
          <div className="max-w-md bg-stone-950/95 text-white backdrop-blur-xl border border-stone-700/80 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 relative">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-[11px] font-black flex items-center justify-center smooth-nums">
                  {cartTotalItems.toLocaleString('fa-IR')}
                </span>
              </div>
              <div>
                <div className="text-xs font-extrabold text-white smooth-nums">
                  سبد خرید ({cartTotalItems.toLocaleString('fa-IR')} قلم)
                </div>
                <div className="text-xs text-amber-300 font-black smooth-nums">
                  {cartFinalPayable.toLocaleString('fa-IR')} تومان
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenCart}
              className="px-4 py-2 text-xs font-extrabold rounded-xl bg-amber-400 text-stone-950 hover:bg-amber-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              تسویه حساب آنی ←
            </button>
          </div>
        </div>
      )}

      {/* Slide-Over Cart & One-Step Checkout Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex justify-end" onClick={onCloseCart}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-full bg-white dark:bg-[#111827] border-r border-stone-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#1D4ED8] dark:text-amber-400" />
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                    سبد خرید و تسویه حساب یک‌مرحله‌ای
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    تشخیص هوشمند تحویل دیجیتال/فیزیکی • شاپرک و اقساط ۴ قسطه
                    {stockReservedLabel ? ` • ${stockReservedLabel}` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onCloseCart} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-sm text-stone-500">سبد خرید شما در حال حاضر خالی است.</p>
                  <button type="button" onClick={onCloseCart} className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentStyles.button}`}>
                    بازگشت به فروشگاه
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Cart Line Items */}
                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div key={item.product.id} className="p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-stone-50/50 dark:bg-slate-900/40">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-stone-500">
                            <span>{item.product.category}</span>
                            <span>•</span>
                            <span className={item.product.deliveryType === 'physical' ? 'text-amber-600' : 'text-emerald-600'}>
                              {item.product.deliveryType === 'physical' ? 'ارسال فیزیکی + دیجیتال' : 'تحویل آنی دیجیتال'}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white truncate">{item.product.title}</div>
                          <div className="text-xs font-black text-[#1D4ED8] dark:text-sky-400 smooth-nums">
                            {(item.product.price * item.quantity).toLocaleString('fa-IR')} تومان
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => onUpdateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg border border-stone-300 dark:border-slate-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                          <span className="text-xs font-extrabold w-5 text-center smooth-nums">{item.quantity.toLocaleString('fa-IR')}</span>
                          <button type="button" onClick={() => onUpdateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg border border-stone-300 dark:border-slate-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 2. Inline Mobile + OTP Login Inside Drawer (if Guest) */}
                  {!isLoggedIn ? (
                    <div className="p-4 rounded-2xl border border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#1D4ED8] dark:text-sky-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>احراز هویت سریع با شماره موبایل (درون کشو)</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-[#1D4ED8]">بدون خروج از سبد</span>
                      </div>
                      {!inlineOtpSent ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input type="tel" dir="ltr" value={inlinePhone} onChange={(e) => setInlinePhone(e.target.value)} placeholder="0912..." className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-right" />
                            <input type="text" value={inlineName} onChange={(e) => setInlineName(e.target.value)} placeholder="نام و نام خانوادگی" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                          </div>
                          <button type="button" disabled={inlineAuthBusy} onClick={() => void handleSendInlineOtp()} className="w-full py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold hover:bg-blue-800 cursor-pointer">
                            {inlineAuthBusy ? 'در حال ارسال پیامک...' : 'دریافت کد تایید پیامکی (OTP)'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type={inlineIsMasterCode ? 'password' : 'text'}
                              dir="ltr"
                              value={inlineOtp}
                              onChange={(e) => setInlineOtp(e.target.value)}
                              placeholder={inlineIsMasterCode ? 'کد مستر مدیریت' : 'کد ۵ رقمی پیامکی'}
                              className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold text-center"
                            />
                            <button type="button" disabled={inlineAuthBusy} onClick={() => void handleVerifyInlineOtp()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">
                              تایید و ورود
                            </button>
                          </div>
                        </div>
                      )}
                      {inlineAuthError && <div className="text-[11px] font-bold text-rose-600">{inlineAuthError}</div>}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>حساب تاییدشده: {loggedInName || 'کاربر'}</span>
                      </span>
                      <span dir="ltr" className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{loggedInPhone}</span>
                    </div>
                  )}

                  {/* 3. Smart Digital vs Physical Delivery Mode */}
                  <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                        {requiresPhysicalShipping ? <Truck className="w-4 h-4 text-amber-600" /> : <Zap className="w-4 h-4 text-emerald-600" />}
                        <span>{requiresPhysicalShipping ? 'ارسال پستی پکیج فیزیکی + دانلود آنی' : 'تحویل آنی دیجیتال (بدون نیاز به آدرس پستی)'}</span>
                      </span>
                      {!cartHasPhysicalItem && (
                        <button
                          type="button"
                          onClick={() => setRequestPhysicalPackage((p) => !p)}
                          className="text-[11px] font-extrabold text-[#1D4ED8] hover:underline cursor-pointer"
                        >
                          {requestPhysicalPackage ? 'تغییر به تحویل دیجیتال' : '+ درخواست پکیج فیزیکی'}
                        </button>
                      )}
                    </div>

                    {requiresPhysicalShipping && (
                      <div className="pt-2 border-t border-stone-200 dark:border-slate-800 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={provinceId}
                            onChange={(e) => {
                              setProvinceId(e.target.value);
                              const firstCity = getCitiesByProvince(e.target.value)[0];
                              if (firstCity) setCityName(firstCity);
                            }}
                            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          >
                            {IRAN_PROVINCES.map((p) => (
                              <option key={p.id} value={p.id}>{p.nameFa}</option>
                            ))}
                          </select>
                          <select
                            value={cityName}
                            onChange={(e) => setCityName(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          >
                            {availableCities.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" dir="ltr" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="کد ملی ۱۰ رقمی" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-right" />
                          <input type="text" dir="ltr" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="کد پستی ۱۰ رقمی" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-right" />
                        </div>
                        <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="خیابان، کوچه، پلاک و واحد..." className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                        {shippingError && <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span>{shippingError}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* 4. Coupon Box */}
                  <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-[#1D4ED8]" /><span>کد تخفیف</span></span>
                      <div className="flex items-center gap-1 text-[11px]">
                        {coupons.filter((c) => c.active).map((c) => (
                          <button key={c.code} type="button" onClick={() => onApplyCoupon(c.code)} className="px-2 py-0.5 rounded bg-stone-200/80 dark:bg-slate-800 font-bold cursor-pointer">{c.code}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" dir="ltr" value={couponInput} onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())} placeholder="SKILL98" className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900" />
                      {appliedCoupon ? (
                        <button type="button" onClick={onClearCoupon} className="px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-300 text-rose-700 cursor-pointer">حذف</button>
                      ) : (
                        <button type="button" onClick={() => onApplyCoupon()} className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-stone-900 text-white cursor-pointer">اعمال</button>
                      )}
                    </div>
                    {couponMessage && <div className={`text-[11px] font-bold ${couponMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{couponMessage.text}</div>}
                  </div>

                  {/* 5. Smart Payment Split (Cash Shaparak vs 4-Installment BNPL) & Invoice Choice */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPaymentPlanTab('cash_shaparak')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                          paymentPlanTab === 'cash_shaparak' ? 'bg-white dark:bg-[#1E293B] text-stone-900 dark:text-white shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        پرداخت نقدی و آنی (شاپرک)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentPlanTab('bnpl_4x')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          paymentPlanTab === 'bnpl_4x' ? 'bg-white dark:bg-[#1E293B] text-[#1D4ED8] dark:text-sky-400 shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>اقساطی ۴ قسطه (BNPL)</span>
                      </button>
                    </div>

                    {paymentPlanTab === 'bnpl_4x' && (
                      <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/25 space-y-2">
                        <div className="text-xs font-extrabold text-[#1D4ED8] dark:text-sky-300">
                          پرداخت ۴ قسط مساوی بدون سود (اسنپ‌پی / ترب‌پی / تارا)
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          {['قسط ۱ (امروز)', 'ماه دوم', 'ماه سوم', 'ماه چهارم'].map((lbl, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                              <div className="text-[10px] text-stone-500">{lbl}</div>
                              <div className="text-[11px] font-black text-stone-900 dark:text-white smooth-nums">{bnplPerInstallment.toLocaleString('fa-IR')} ت</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gateway Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeGateways.map((gw) => {
                        const isSelected = selectedGatewayId === gw.id;
                        return (
                          <button
                            key={gw.id}
                            type="button"
                            onClick={() => onSelectGateway(gw.id)}
                            className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected ? 'border-[#1D4ED8] bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-[#1D4ED8]' : 'border-stone-200 dark:border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-extrabold text-stone-900 dark:text-white">{gw.title}</div>
                              <div className="text-[10px] text-stone-500">{gw.subtitle}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#1D4ED8] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Official Tax vs Standard Invoice Choice */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/40 text-xs">
                      <span className="font-bold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#1D4ED8]" /><span>نوع صورتحساب:</span></span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setInvoiceKind('standard')} className={`px-2.5 py-1 rounded-lg font-extrabold cursor-pointer ${invoiceKind === 'standard' ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950' : 'text-stone-500'}`}>فاکتور فروشگاهی</button>
                        <button type="button" onClick={() => setInvoiceKind('official_tax')} className={`px-2.5 py-1 rounded-lg font-extrabold cursor-pointer ${invoiceKind === 'official_tax' ? 'bg-[#1D4ED8] text-white' : 'text-stone-500'}`}>فاکتور رسمی دارایی</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Sticky Footer Summary & Submit */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-500">
                    <span>جمع اقلام ({cartTotalItems.toLocaleString('fa-IR')} مورد):</span>
                    <span className="font-bold smooth-nums">{cartSubtotalAmount.toLocaleString('fa-IR')} تومان</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>تخفیف ({appliedCoupon?.code}):</span>
                      <span className="smooth-nums">- {discountAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-200 dark:border-slate-800 text-sm">
                    <span className="font-extrabold text-stone-900 dark:text-white">
                      {paymentPlanTab === 'bnpl_4x' ? 'مبلغ قسط اول (امروز):' : 'مبلغ قابل پرداخت:'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-[#1D4ED8] dark:text-amber-400 smooth-nums">
                      {(paymentPlanTab === 'bnpl_4x' ? bnplPerInstallment : cartFinalPayable).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={activeGateways.length === 0}
                  onClick={handleProceedCheckout}
                  className={`w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${accentStyles.button}`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {paymentPlanTab === 'bnpl_4x'
                      ? 'پرداخت قسط اول و فعال‌سازی آنی سفارش'
                      : 'اتصال به درگاه شاپرک و تکمیل خرید'}
                  </span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};
