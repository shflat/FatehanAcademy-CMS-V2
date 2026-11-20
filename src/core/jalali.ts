export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDateParts {
  gy: number;
  gm: number;
  gd: number;
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export function toPersianDigits(input: string | number): string {
  const str = String(input);
  const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (d) => p[Number(d)] || d);
}

export function toEnglishDigits(input: string | number): string {
  let str = String(input);
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  for (let i = 0; i < 10; i++) {
    str = str
      .replace(new RegExp(persian[i], 'g'), String(i))
      .replace(new RegExp(arabic[i], 'g'), String(i));
  }
  return str;
}

/**
 * Exact algorithmic conversion from Gregorian (gy, gm, gd) to Jalali (jy, jm, jd)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateParts {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/**
 * Exact algorithmic conversion from Jalali (jy, jm, jd) to Gregorian (gy, gm, gd)
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDateParts {
  const jyAdj = jy + 1595;
  let days =
    -355668 +
    365 * jyAdj +
    Math.floor(jyAdj / 33) * 8 +
    Math.floor(((jyAdj % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal_a = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
}

/**
 * Converts an ISO-8601 / Date object into a formatted Jalali string (e.g. ۱۴۰۵/۰۸/۲۸)
 */
export function formatIsoToJalali(
  isoOrDate?: string | Date | null,
  options?: { includeTime?: boolean; persianDigits?: boolean; withMonthName?: boolean }
): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  const { jy, jm, jd } = gregorianToJalali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
  const useFa = options?.persianDigits !== false;
  const yStr = String(jy);
  const mStr = String(jm).padStart(2, '0');
  const dStr = String(jd).padStart(2, '0');

  let base = options?.withMonthName
    ? `${jd} ${JALALI_MONTH_NAMES[jm - 1] || ''} ${jy}`
    : `${yStr}/${mStr}/${dStr}`;

  if (options?.includeTime) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    base = `${base} · ${hh}:${mm}`;
  }
  return useFa ? toPersianDigits(base) : base;
}

/**
 * Parses a Jalali date string ("1405/08/28" or "۱۴۰۵-۰۸-۲۸") and returns a UTC ISO-8601 string
 */
export function jalaliStringToIsoUtc(jalaliStr: string): string {
  const clean = toEnglishDigits(jalaliStr).trim();
  const parts = clean.split(/[\/\-]/).map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date().toISOString();
  }
  const [jy, jm, jd] = parts;
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0)).toISOString();
}

export function formatToman(amount: number): string {
  return `${Number(amount || 0).toLocaleString('fa-IR')} تومان`;
}
