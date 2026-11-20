import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatToman, formatPersianNumber } from '../utils/formatters';
import { BiDiText } from '../ui/BiDiText';
import {
  ShoppingBag,
  X,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Plus,
  Minus,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cartItems,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    navigateStore,
    state,
    settings,
  } = useFatehanTheme();

  const subtotalToman = cartItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const cashbackPercent = state.cashbackConfig?.enabled ? state.cashbackConfig.cashbackPercent : 3;
  const maxCashback = state.cashbackConfig?.maxCashbackPerOrderToman || 5_000_000;
  const estimatedCashback = Math.min(maxCashback, Math.round((subtotalToman * cashbackPercent) / 100));

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsCartDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">سبد خرید {settings.academyNameFa}</h3>
                  <p className="text-[11px] text-slate-400">
                    {formatPersianNumber(cartItems.reduce((s, i) => s + i.qty, 0))} کالا در سبد شما
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-800">
                      سبد خرید شما در حال حاضر خالی است
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      کیت‌های رباتیک، بردهای الکترونیک یا دوره‌های تخصصی را از فروشگاه انتخاب کنید.
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateStore('/shop')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    مشاهده کاتالوگ محصولات (/shop)
                  </motion.button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.cartKey}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 60, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex gap-3 items-start"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-900"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <BiDiText
                          as="h4"
                          className="text-xs font-bold text-slate-900 leading-snug line-clamp-2"
                        >
                          {item.title}
                        </BiDiText>
                        {item.variationSummary && (
                          <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            {item.variationSummary}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-500" dir="ltr">
                          SKU: {item.sku}
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.cartKey, item.qty - 1)}
                              className="p-1 text-slate-600 hover:text-rose-600 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold px-1.5 text-slate-900">
                              {formatPersianNumber(item.qty)}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(item.cartKey, item.qty + 1)}
                              className="p-1 text-slate-600 hover:text-indigo-600 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                              {formatToman(item.qty * item.unitPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.cartKey)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="حذف از سبد خرید"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3.5">
                {estimatedCashback > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-[11px] text-amber-900">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>پاداش کش‌بک کیف پول این سفارش:</span>
                    </span>
                    <span className="font-mono font-extrabold text-amber-700">
                      +{formatToman(estimatedCashback)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">جمع کل اقلام سبد:</span>
                  <span className="text-sm font-mono font-extrabold text-slate-900">
                    {formatToman(subtotalToman)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateStore('/cart')}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl cursor-pointer text-center"
                  >
                    مشاهده سبد و کوپن
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateStore('/checkout')}
                    className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <span>تسویه حساب</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تضمین اصالت و صدور فاکتور رسمی</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-rose-600 hover:underline cursor-pointer font-semibold"
                  >
                    خالی کردن سبد
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
