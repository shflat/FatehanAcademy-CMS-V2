import type {
  AiEngineConfig,
  CmsRoleDefinition,
  CouponRule,
  MediaAssetItem,
  OtpSecurityConfig,
  PaymentDisplayConfig,
  PaymentGatewayOption,
  SkillArticle,
  SkillProduct,
  SmsTriggerEventKey,
  SmsTriggerRule,
  ThemeConfig,
} from '../../core/types.js';
import { EMPTY_ROLE_PERMISSIONS } from '../../core/permissions.js';
import {
  DEFAULT_AI_ENGINE_CONFIG,
  DEFAULT_OTP_SECURITY_CONFIG,
  DEFAULT_PAYMENT_DISPLAY_CONFIG,
  DEFAULT_THEME_CONFIG,
  INITIAL_CMS_ROLES,
  INITIAL_PAYMENT_GATEWAYS,
} from '../../data/defaults.js';
import { checkpointSqlitePassive, dbExec, dbQuery } from './connection.js';
import { getSetting, setSetting } from './settingsLogsRepo.js';
import { listActiveAuthSessions } from './usersSessionsRepo.js';
import { runAutoCrmMatchingEngine } from '../../../modules/mod_smart_crm/smartCrmRouter.js';

export async function getAllPaymentGateways(): Promise<PaymentGatewayOption[]> {
  const rows = await dbQuery<Record<string, unknown>>(
    'SELECT * FROM payment_gateways ORDER BY sort_order ASC'
  );
  const defaultById = new Map(INITIAL_PAYMENT_GATEWAYS.map((g) => [g.id, g]));
  return rows.map((r) => {
    const id = r.id as PaymentGatewayOption['id'];
    const fallback = defaultById.get(id);
    return {
      id,
      title: String(r.title || fallback?.title || ''),
      subtitle: String(r.subtitle || fallback?.subtitle || ''),
      enabled: Boolean(r.enabled),
      gatewayKind:
        (r.gateway_kind as PaymentGatewayOption['gatewayKind']) ||
        fallback?.gatewayKind ||
        'cash',
      installmentMonths: Number(r.installment_months ?? fallback?.installmentMonths ?? 0),
      bnplFeePercent: Number(r.bnpl_fee_percent ?? fallback?.bnplFeePercent ?? 0),
      cashDiscountPercent: Number(r.cash_discount_percent ?? fallback?.cashDiscountPercent ?? 0),
      merchantId: String(r.merchant_id || ''),
      terminalId: String(r.terminal_id || ''),
      apiKey: String(r.api_key || ''),
      passPhrase: String(r.pass_phrase || ''),
      publicKey: String(r.public_key || ''),
      callbackUrl: String(r.callback_url || ''),
      useHostRouter: Boolean(r.use_host_router),
      hostRouterUrl: String(r.host_router_url || ''),
      isShaparakDirect: Boolean(r.is_shaparak_direct),
      sandboxMode: Boolean(r.sandbox_mode),
    };
  });
}

export async function saveAllPaymentGateways(
  gateways: PaymentGatewayOption[],
  displayConfig?: PaymentDisplayConfig
): Promise<void> {
  for (let i = 0; i < gateways.length; i++) {
    const gw = gateways[i];
    await dbExec(
      `INSERT INTO payment_gateways (
         id, title, subtitle, enabled, merchant_id, terminal_id, api_key, pass_phrase, public_key,
         callback_url, use_host_router, host_router_url, is_shaparak_direct, sandbox_mode, sort_order,
         gateway_kind, installment_months, bnpl_fee_percent, cash_discount_percent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         enabled = EXCLUDED.enabled,
         merchant_id = EXCLUDED.merchant_id,
         terminal_id = EXCLUDED.terminal_id,
         api_key = EXCLUDED.api_key,
         pass_phrase = EXCLUDED.pass_phrase,
         public_key = EXCLUDED.public_key,
         callback_url = EXCLUDED.callback_url,
         use_host_router = EXCLUDED.use_host_router,
         host_router_url = EXCLUDED.host_router_url,
         is_shaparak_direct = EXCLUDED.is_shaparak_direct,
         sandbox_mode = EXCLUDED.sandbox_mode,
         sort_order = EXCLUDED.sort_order,
         gateway_kind = EXCLUDED.gateway_kind,
         installment_months = EXCLUDED.installment_months,
         bnpl_fee_percent = EXCLUDED.bnpl_fee_percent,
         cash_discount_percent = EXCLUDED.cash_discount_percent`,
      [
        gw.id,
        gw.title,
        gw.subtitle,
        gw.enabled ? 1 : 0,
        gw.merchantId || '',
        gw.terminalId || '',
        gw.apiKey || '',
        gw.passPhrase || '',
        gw.publicKey || '',
        gw.callbackUrl || '',
        gw.useHostRouter ? 1 : 0,
        gw.hostRouterUrl || '',
        gw.isShaparakDirect ? 1 : 0,
        gw.sandboxMode ? 1 : 0,
        i + 1,
        gw.gatewayKind || 'cash',
        gw.installmentMonths || 0,
        gw.bnplFeePercent || 0,
        gw.cashDiscountPercent || 0,
      ]
    );
  }
  if (displayConfig) {
    await setSetting('payment_display_config', displayConfig);
  }
}

export async function getAllSmsTriggers(): Promise<SmsTriggerRule[]> {
  const rows = await dbQuery<Record<string, unknown>>(
    'SELECT * FROM sms_triggers ORDER BY priority_order ASC'
  );
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title || ''),
    eventKey: r.event_key as SmsTriggerEventKey,
    sectionLabel: String(r.section_label || ''),
    sendMode: r.send_mode === 'pattern_code' ? 'pattern_code' : 'custom_text',
    patternCode: String(r.pattern_code || ''),
    messageTemplate: String(r.message_template || ''),
    enabled: Boolean(r.enabled),
    priorityOrder: Number(r.priority_order || 1),
  }));
}

export async function saveAllSmsTriggers(rules: SmsTriggerRule[]): Promise<void> {
  await dbExec('DELETE FROM sms_triggers');
  for (let i = 0; i < rules.length; i++) {
    const trg = rules[i];
    await dbExec(
      `INSERT INTO sms_triggers (id, title, event_key, section_label, send_mode, pattern_code, message_template, enabled, priority_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        trg.id,
        trg.title,
        trg.eventKey,
        trg.sectionLabel,
        trg.sendMode,
        trg.patternCode || '',
        trg.messageTemplate,
        trg.enabled ? 1 : 0,
        i + 1,
      ]
    );
  }
}

export async function getStorefrontBootstrapData(includeSensitiveAdminData = false) {
  const [
    productRows,
    articleRows,
    couponRows,
    mediaRows,
    orderRows,
    gateways,
    smsTriggers,
    themeConfig,
    aiConfig,
    otpConfig,
    roles,
    sessions,
    paymentDisplayConfig,
  ] = await Promise.all([
    dbQuery<{ payload_json: string }>('SELECT payload_json FROM products ORDER BY featured DESC, id ASC'),
    dbQuery<{ payload_json: string }>('SELECT payload_json FROM articles ORDER BY featured DESC, id ASC'),
    dbQuery<{ code: string; discount_percent: number; description: string; active: number }>('SELECT * FROM coupons'),
    dbQuery<{ payload_json: string }>('SELECT payload_json FROM media_items'),
    includeSensitiveAdminData
      ? dbQuery<Record<string, unknown>>('SELECT * FROM orders ORDER BY created_at DESC LIMIT 150')
      : Promise.resolve([]),
    getAllPaymentGateways(),
    includeSensitiveAdminData ? getAllSmsTriggers() : Promise.resolve([]),
    getSetting<ThemeConfig>('theme_config', DEFAULT_THEME_CONFIG),
    getSetting<AiEngineConfig>('ai_config', DEFAULT_AI_ENGINE_CONFIG),
    getSetting<OtpSecurityConfig>('otp_config', DEFAULT_OTP_SECURITY_CONFIG),
    getSetting<CmsRoleDefinition[]>('roles_config', INITIAL_CMS_ROLES),
    includeSensitiveAdminData ? listActiveAuthSessions() : Promise.resolve([]),
    getSetting<PaymentDisplayConfig>('payment_display_config', DEFAULT_PAYMENT_DISPLAY_CONFIG),
  ]);

  const products: SkillProduct[] = productRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as SkillProduct;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SkillProduct[];

  const articles: SkillArticle[] = articleRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as SkillArticle;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SkillArticle[];

  const mediaItems: MediaAssetItem[] = mediaRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as MediaAssetItem;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as MediaAssetItem[];

  const coupons: CouponRule[] = couponRows.map((c) => ({
    code: String(c.code),
    discountPercent: Number(c.discount_percent),
    description: String(c.description),
    active: Boolean(c.active),
  }));

  const orders = orderRows.map((o) => ({
    id: String(o.id),
    buyerId: String(o.buyer_phone || ''),
    buyerName: String(o.buyer_name || ''),
    totalAmount: Number(o.total_amount || 0),
    discountAmount: o.discount_amount ? Number(o.discount_amount) : undefined,
    couponCode: o.coupon_code ? String(o.coupon_code) : undefined,
    itemsSummary: String(o.items_summary || ''),
    itemsCount: Number(o.items_count || 1),
    paymentMethod: String(o.payment_method || 'irankish'),
    status: String(o.status || 'paid'),
    createdAtLabel: String(o.created_at_label || ''),
  }));

  // Strip gateway secrets on unauthenticated public storefront bootstrap
  const sanitizedGateways = includeSensitiveAdminData
    ? gateways
    : gateways.map((gw) => ({
        id: gw.id,
        title: gw.title,
        subtitle: gw.subtitle,
        enabled: gw.enabled,
        gatewayKind: gw.gatewayKind,
        installmentMonths: gw.installmentMonths,
        bnplFeePercent: gw.bnplFeePercent,
        cashDiscountPercent: gw.cashDiscountPercent,
        isShaparakDirect: gw.isShaparakDirect,
        sandboxMode: gw.sandboxMode,
      }));

  const userRoleRows = await dbQuery<{ role: string; role_id: string | null }>(
    'SELECT role, role_id FROM users'
  );
  const countByRoleId = new Map<string, number>();
  for (const ur of userRoleRows) {
    const rid =
      ur.role_id ||
      (ur.role === 'super_admin'
        ? 'role_super_admin'
        : ur.role === 'admin'
        ? 'role_admin'
        : 'role_customer');
    countByRoleId.set(rid, (countByRoleId.get(rid) || 0) + 1);
  }

  const normalizedRoles: CmsRoleDefinition[] = roles.map((r) => ({
    ...r,
    usersCount: countByRoleId.get(r.id) || 0,
    permissions: {
      ...EMPTY_ROLE_PERMISSIONS,
      ...(r.permissions || {}),
    },
  }));

  // Zero-leak protection: strip raw download URLs/paths on public storefront bootstrap
  const sanitizedProducts: SkillProduct[] = includeSensitiveAdminData
    ? products
    : products.map((p) =>
        p.downloadFiles && p.downloadFiles.length > 0
          ? {
              ...p,
              downloadFiles: p.downloadFiles.map((f) => ({
                id: f.id,
                title: f.title,
                fileName: f.fileName,
                storageType: f.storageType,
                fileSizeLabel: f.fileSizeLabel,
                version: f.version,
                protectedDownload: true,
              })),
            }
          : p
      );

  return {
    products: sanitizedProducts,
    articles,
    coupons,
    mediaItems,
    orders,
    gateways: sanitizedGateways,
    paymentDisplayConfig,
    smsTriggers,
    themeConfig,
    aiConfig,
    otpConfig,
    roles: normalizedRoles,
    sessions,
  };
}

export async function syncCmsEntities(payload: {
  products?: SkillProduct[];
  articles?: SkillArticle[];
  coupons?: CouponRule[];
  mediaItems?: MediaAssetItem[];
  gateways?: PaymentGatewayOption[];
  themeConfig?: ThemeConfig;
  aiConfig?: AiEngineConfig;
  otpConfig?: OtpSecurityConfig;
  roles?: CmsRoleDefinition[];
  sessions?: unknown[];
}) {
  const nowIso = new Date().toISOString();

  await dbExec('BEGIN');
  try {
    if (Array.isArray(payload.products)) {
      await dbExec('DELETE FROM products');
      for (const p of payload.products) {
        await dbExec(
          `INSERT INTO products (id, slug, title, category, item_type, price, original_price, status, featured, payload_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            p.id,
            p.slug || p.id,
            p.title,
            p.category,
            p.itemType,
            p.price,
            p.originalPrice || 0,
            p.status,
            p.featured ? 1 : 0,
            JSON.stringify(p),
            nowIso,
          ]
        );
      }
    }

    if (Array.isArray(payload.articles)) {
      await dbExec('DELETE FROM articles');
      for (const a of payload.articles) {
        await dbExec(
          `INSERT INTO articles (id, slug, title, category, status, featured, payload_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            a.id,
            a.slug || a.id,
            a.title,
            a.category,
            a.status,
            a.featured ? 1 : 0,
            JSON.stringify(a),
            nowIso,
          ]
        );
      }
    }

    if (Array.isArray(payload.coupons)) {
      await dbExec('DELETE FROM coupons');
      for (const c of payload.coupons) {
        await dbExec(
          `INSERT INTO coupons (code, discount_percent, description, active) VALUES ($1, $2, $3, $4)`,
          [c.code, c.discountPercent, c.description, c.active ? 1 : 0]
        );
      }
    }

    if (Array.isArray(payload.mediaItems)) {
      await dbExec('DELETE FROM media_items');
      for (const m of payload.mediaItems) {
        await dbExec(
          `INSERT INTO media_items (id, title, url, category, payload_json, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [m.id, m.title, m.url, m.category || 'article', JSON.stringify(m), nowIso]
        );
      }
    }

    if (Array.isArray(payload.gateways)) {
      await saveAllPaymentGateways(payload.gateways);
    }

    if (payload.themeConfig) await setSetting('theme_config', payload.themeConfig);
    if (payload.aiConfig) await setSetting('ai_config', payload.aiConfig);
    if (payload.otpConfig) await setSetting('otp_config', payload.otpConfig);
    if (payload.roles) await setSetting('roles_config', payload.roles);
    if (payload.sessions) await setSetting('sessions_config', payload.sessions);

    await dbExec('COMMIT');
    checkpointSqlitePassive();
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      void runAutoCrmMatchingEngine('product_updated').catch(() => {
        // non-blocking CRM recommendation refresh
      });
    }
  } catch (err) {
    try {
      await dbExec('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    throw err;
  }
}
