/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — Persian Formatting & TTL Cache Utilities
 */

export function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount || 0) + ' تومان';
}

export function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num || 0);
}

class ThemeClientCache {
  private store = new Map<string, { data: unknown; expiresAt: number }>();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.data as T;
  }

  set(key: string, data: unknown, ttlMs = 30_000): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export const themeClientCache = new ThemeClientCache();
