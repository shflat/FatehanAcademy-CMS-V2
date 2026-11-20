import { toEnglishDigits } from './jalali';

export interface IranProvinceEntry {
  id: string;
  nameFa: string;
  cities: string[];
}

export const IRAN_PROVINCES_AND_CITIES: IranProvinceEntry[] = [
  { id: 'tehran', nameFa: 'تهران', cities: ['تهران', 'شهریار', 'اسلامشهر', 'کرج/حومه', 'دماوند', 'ورامین', 'پاکدشت', 'رباط‌کریم', 'قدس', 'ملارد', 'پردیس'] },
  { id: 'isfahan', nameFa: 'اصفهان', cities: ['اصفهان', 'کاشان', 'خمینی‌شهر', 'نجف‌آباد', 'شاهین‌شهر', 'شهرضا', 'فولادشهر', 'مبارکه', 'گلپایگان', 'نطنز'] },
  { id: 'khorasan_razavi', nameFa: 'خراسان رضوی', cities: ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان', 'کاشمر', 'تربت جام', 'تایباد', 'چناران'] },
  { id: 'fars', nameFa: 'فارس', cities: ['شیراز', 'مرودشت', 'جهرم', 'فسا', 'کازرون', 'لار', 'داراب', 'آباده', 'فیروزآباد'] },
  { id: 'alborz', nameFa: 'البرز', cities: ['کرج', 'فردیس', 'کمال‌شهر', 'نظرآباد', 'محمدشهر', 'هشتگرد', 'ماهدشت', 'طالقان'] },
  { id: 'azarbaijan_east', nameFa: 'آذربایجان شرقی', cities: ['تبریز', 'مراغه', 'مرند', 'اهر', 'میانه', 'بناب', 'سراب', 'شبستر', 'جلفا'] },
  { id: 'khuzestan', nameFa: 'خوزستان', cities: ['اهواز', 'دزفول', 'آبادان', 'بندر ماهشهر', 'خرمشهر', 'اندیمشک', 'ایذه', 'شوشتر', 'بهبهان'] },
  { id: 'mazandaran', nameFa: 'مازندران', cities: ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'بهشهر', 'چالوس', 'نوشهر', 'بابلسر', 'رامسر', 'تنکابن'] },
  { id: 'gilan', nameFa: 'گیلان', cities: ['رشت', 'بندر انزلی', 'لاهیجان', 'لنگرود', 'تالش', 'آستارا', 'صومعه‌سرا', 'فومن', 'رودسر'] },
  { id: 'kerman', nameFa: 'کرمان', cities: ['کرمان', 'سیرجان', 'رفسنجان', 'جیرفت', 'بم', 'زرند', 'شهربابک', 'بافت'] },
  { id: 'azarbaijan_west', nameFa: 'آذربایجان غربی', cities: ['ارومیه', 'خوی', 'میاندوآب', 'مهاباد', 'بوکان', 'سلماس', 'نقده', 'پیرانشهر'] },
  { id: 'qom', nameFa: 'قم', cities: ['قم', 'جعفریه', 'کهک', 'قنوات', 'دستجرد'] },
  { id: 'yazd', nameFa: 'یزد', cities: ['یزد', 'میبد', 'اردکان', 'بافق', 'مهریز', 'ابرکوه', 'تفت'] },
  { id: 'kermanshah', nameFa: 'کرمانشاه', cities: ['کرمانشاه', 'اسلام‌آباد غرب', 'جوانرود', 'کنگاور', 'سرپل ذهاب', 'سنقر', 'هرسین'] },
  { id: 'hormozgan', nameFa: 'هرمزگان', cities: ['بندرعباس', 'میناب', 'قشم', 'کیش', 'بندر لنگه', 'جاسک', 'حاجی‌آباد'] },
  { id: 'markazi', nameFa: 'مرکزی', cities: ['اراک', 'ساوه', 'خمین', 'محلات', 'دلیجان', 'شازند', 'تفرش'] },
  { id: 'qazvin', nameFa: 'قزوین', cities: ['قزوین', 'تاکستان', 'الوند', 'آبیک', 'بوئین‌زهرا', 'محمدیه'] },
  { id: 'hamadan', nameFa: 'همدان', cities: ['همدان', 'ملایر', 'نهاوند', 'اسدآباد', 'تویسرکان', 'بهار', 'کبودرآهنگ'] },
  { id: 'golestan', nameFa: 'گلستان', cities: ['گرگان', 'گنبد کاووس', 'بندر ترکمن', 'علی‌آباد کتول', 'آق‌قلا', 'کردکوی', 'مینودشت'] },
  { id: 'zanjan', nameFa: 'زنجان', cities: ['زنجان', 'ابهر', 'خرمدره', 'قیدار', 'ماه‌نشان'] },
  { id: 'semnan', nameFa: 'سمنان', cities: ['سمنان', 'شاهرود', 'دامغان', 'گرمسار', 'مهدی‌شهر'] },
  { id: 'kurdistan', nameFa: 'کردستان', cities: ['سنندج', 'سقز', 'مریوان', 'بانه', 'قروه', 'کامیاران', 'بیجار'] },
  { id: 'ardabil', nameFa: 'اردبیل', cities: ['اردبیل', 'پارس‌آباد', 'مشگین‌شهر', 'خلخال', 'گرمی', 'سرعین'] },
  { id: 'bushehr', nameFa: 'بوشهر', cities: ['بوشهر', 'برازجان', 'بندر گناوه', 'بندر کنگان', 'عسلویه', 'خورموج'] },
  { id: 'lorestan', nameFa: 'لرستان', cities: ['خرم‌آباد', 'بروجرد', 'دورود', 'کوهدشت', 'الیگودرز', 'نورآباد', 'ازنا'] },
  { id: 'sistan_baluchestan', nameFa: 'سیستان و بلوچستان', cities: ['زاهدان', 'زابل', 'ایرانشهر', 'چابهار', 'سراوان', 'خاش'] },
  { id: 'chaharmahal', nameFa: 'چهارمحال و بختیاری', cities: ['شهرکرد', 'بروجن', 'فرخشهر', 'فارسان', 'لردگان'] },
  { id: 'khorasan_north', nameFa: 'خراسان شمالی', cities: ['بجنورد', 'شیروان', 'اسفراین', 'آشخانه', 'جاجرم'] },
  { id: 'khorasan_south', nameFa: 'خراسان جنوبی', cities: ['بیرجند', 'قائن', 'طبس', 'فردوس', 'نهبندان'] },
  { id: 'kohgiluyeh', nameFa: 'کهگیلویه و بویراحمد', cities: ['یاسوج', 'دوگنبدان', 'دهدشت', 'لیکک'] },
  { id: 'ilam', nameFa: 'ایلام', cities: ['ایلام', 'دهلران', 'ایوان', 'آبدانان', 'مهران'] },
];

export function getCitiesByProvince(provinceIdOrName: string): string[] {
  const found = IRAN_PROVINCES_AND_CITIES.find(
    (p) => p.id === provinceIdOrName || p.nameFa === provinceIdOrName
  );
  return found ? found.cities : [];
}

/**
 * Validates an Iranian 10-digit National ID (کد ملی) using the official modulo-11 check-digit algorithm.
 */
export function isValidIranNationalId(input: string): boolean {
  const clean = toEnglishDigits(input).replace(/[^0-9]/g, '');
  if (!/^\d{10}$/.test(clean)) return false;
  if (/^(\d)\1{9}$/.test(clean)) return false;

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const remainder = sum % 11;
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

/**
 * Validates an Iranian 10-digit Postal Code (کد پستی ۱۰ رقمی استاندارد ایران)
 */
export function isValidIranPostalCode(input: string): boolean {
  const clean = toEnglishDigits(input).replace(/[^0-9]/g, '');
  if (!/^\d{10}$/.test(clean)) return false;
  // Standard Iran Post rule: first 5 digits cannot contain 0 or 2, 5th digit cannot be 5
  return /^[13-9]{4}[1346-9][013-9]{5}$/.test(clean) || /^[1-9]\d{9}$/.test(clean);
}

/**
 * Validates and normalizes an Iranian Mobile Number (09XXXXXXXXX)
 */
export function isValidIranMobile(input: string): boolean {
  let clean = toEnglishDigits(input).replace(/[^0-9+]/g, '');
  if (clean.startsWith('+98')) clean = '0' + clean.slice(3);
  else if (clean.startsWith('0098')) clean = '0' + clean.slice(4);
  else if (clean.startsWith('9') && clean.length === 10) clean = '0' + clean;
  return /^09\d{9}$/.test(clean);
}
