import { dbExec, dbQuery } from './connection.js';

export interface ModPaymentDriverRecord {
  id: string;
  gatewayKind: 'cash_psp' | 'bnpl_installment';
  titleFa: string;
  providerCode: string;
  enabled: boolean;
  sandboxMode: boolean;
  cashDiscountPercent: number;
  bnplFeePercent: number;
  installmentsCount: number;
  credentialsJson: Record<string, string>;
  sortOrder: number;
  updatedAt: string;
}

export const INITIAL_PAYZITO_DRIVERS: Omit<ModPaymentDriverRecord, 'updatedAt'>[] = [
  // 8 Iranian Bank / PSP Cash Gateways
  { id: 'irankish', gatewayKind: 'cash_psp', titleFa: 'درگاه مستقیم ایران‌کیش (شاپرک)', providerCode: 'IRANKISH', enabled: true, sandboxMode: false, cashDiscountPercent: 3, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { terminalId: 'IKC-9801', acceptorId: '9824100', passPhrase: '***', publicKey: 'RSA-2048' }, sortOrder: 1 },
  { id: 'behpardakht_mellat', gatewayKind: 'cash_psp', titleFa: 'به‌پرداخت ملت (بانک ملت)', providerCode: 'MELLAT', enabled: true, sandboxMode: false, cashDiscountPercent: 3, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { terminalId: 'BPM-4412', username: 'skill98_bpm', password: '***' }, sortOrder: 2 },
  { id: 'sadad_melli', gatewayKind: 'cash_psp', titleFa: 'سداد بانک ملی ایران', providerCode: 'SADAD', enabled: true, sandboxMode: false, cashDiscountPercent: 3, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { merchantId: 'SADAD-104', terminalId: 'SD-881', terminalKey: '***' }, sortOrder: 3 },
  { id: 'sep_saman', gatewayKind: 'cash_psp', titleFa: 'سپ (پرداخت الکترونیک سامان)', providerCode: 'SEP', enabled: true, sandboxMode: false, cashDiscountPercent: 2, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { terminalId: 'SEP-11402', password: '***' }, sortOrder: 4 },
  { id: 'pec_parsian', gatewayKind: 'cash_psp', titleFa: 'تجارت الکترونیک پارسیان (پک)', providerCode: 'PARSIAN', enabled: false, sandboxMode: false, cashDiscountPercent: 2, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { pinAccount: 'PEC-7790', callbackDomain: 'https://skill98.ir' }, sortOrder: 5 },
  { id: 'zarinpal_online', gatewayKind: 'cash_psp', titleFa: 'درگاه واسط زرین‌پال', providerCode: 'ZARINPAL', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { merchantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, sortOrder: 6 },
  { id: 'zibal_direct', gatewayKind: 'cash_psp', titleFa: 'درگاه هوشمند زیبال', providerCode: 'ZIBAL', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { merchant: 'zibal', secretKey: '***' }, sortOrder: 7 },
  { id: 'idpay_gateway', gatewayKind: 'cash_psp', titleFa: 'درگاه پرداخت آیدی‌پی (IDPay)', providerCode: 'IDPAY', enabled: false, sandboxMode: true, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 1, credentialsJson: { apiKey: 'idpay-api-key-98' }, sortOrder: 8 },

  // 9 Iranian BNPL Installment Gateways
  { id: 'snapppay', gatewayKind: 'bnpl_installment', titleFa: 'پرداخت اقساطی ۴ قسطه اسنپ‌پی (SnappPay)', providerCode: 'SNAPPPAY', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 4, credentialsJson: { clientId: 'snapp_client_98', clientSecret: '***', merchantCode: 'SP-98' }, sortOrder: 9 },
  { id: 'torobpay', gatewayKind: 'bnpl_installment', titleFa: 'خرید اقساطی ترب‌پی (TorobPay)', providerCode: 'TOROBPAY', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 4, credentialsJson: { apiKey: 'torob_bnpl_98', storeId: 'TRB-104' }, sortOrder: 10 },
  { id: 'digipay', gatewayKind: 'bnpl_installment', titleFa: 'اعتبار اقساطی دیجی‌پی (DigiPay)', providerCode: 'DIGIPAY', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 2.5, installmentsCount: 4, credentialsJson: { username: 'digipay_merchant', clientId: 'DP-980', secret: '***' }, sortOrder: 11 },
  { id: 'tara', gatewayKind: 'bnpl_installment', titleFa: 'شبکه اعتباری و اقساطی تارا (Tara)', providerCode: 'TARA', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 0, installmentsCount: 4, credentialsJson: { terminalCode: 'TARA-550', apiKey: '***' }, sortOrder: 12 },
  { id: 'azkivam', gatewayKind: 'bnpl_installment', titleFa: 'خرید اعتباری بلندمدت ازکی‌وام (AzkiVam)', providerCode: 'AZKIVAM', enabled: true, sandboxMode: false, cashDiscountPercent: 0, bnplFeePercent: 4.5, installmentsCount: 6, credentialsJson: { merchantId: 'AZKI-9801', apiSecret: '***' }, sortOrder: 13 },
  { id: 'anisa', gatewayKind: 'bnpl_installment', titleFa: 'درگاه اعتبار اقساطی آنیسا (Anisa)', providerCode: 'ANISA', enabled: false, sandboxMode: true, cashDiscountPercent: 0, bnplFeePercent: 3, installmentsCount: 4, credentialsJson: { partnerCode: 'ANISA-98', apiToken: '***' }, sortOrder: 14 },
  { id: 'kalapay', gatewayKind: 'bnpl_installment', titleFa: 'تسهیلات خرید اقساطی کالاپی (KalaPay)', providerCode: 'KALAPAY', enabled: false, sandboxMode: true, cashDiscountPercent: 0, bnplFeePercent: 5, installmentsCount: 12, credentialsJson: { merchantKey: 'KP-8840', secret: '***' }, sortOrder: 15 },
  { id: 'kalano', gatewayKind: 'bnpl_installment', titleFa: 'اعتبار سازمانی کالانو (Kalano)', providerCode: 'KALANO', enabled: false, sandboxMode: true, cashDiscountPercent: 0, bnplFeePercent: 4, installmentsCount: 6, credentialsJson: { storeCode: 'KLN-201', token: '***' }, sortOrder: 16 },
  { id: 'ghesti', gatewayKind: 'bnpl_installment', titleFa: 'سامانه خرید قسطی (Ghesti Club)', providerCode: 'GHESTI', enabled: false, sandboxMode: true, cashDiscountPercent: 0, bnplFeePercent: 3.5, installmentsCount: 4, credentialsJson: { terminalId: 'GHS-412', apiKey: '***' }, sortOrder: 17 },
];

export async function createAndSeedPhase5ModulesSchema(nowIso: string): Promise<void> {
  // 1. mod_payment_hub_drivers (Payzito-Style Cash + BNPL Drivers)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_payment_hub_drivers (
      id TEXT PRIMARY KEY,
      gateway_kind TEXT NOT NULL DEFAULT 'cash_psp',
      title_fa TEXT NOT NULL,
      provider_code TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sandbox_mode INTEGER NOT NULL DEFAULT 0,
      cash_discount_percent REAL NOT NULL DEFAULT 0,
      bnpl_fee_percent REAL NOT NULL DEFAULT 0,
      installments_count INTEGER NOT NULL DEFAULT 1,
      credentials_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);

  // 2. mod_inventory_stock & mod_inventory_reservations (Flash-Sale / Black Friday Lock)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_inventory_stock (
      product_id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      product_title TEXT NOT NULL,
      stock_qty INTEGER NOT NULL DEFAULT 50,
      reserved_qty INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      is_unlimited_digital INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_inventory_reservations (
      id TEXT PRIMARY KEY,
      session_key TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    )
  `);

  // 3. mod_accounting_ledger (Automated Store Accounting & Tax Ledger)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_accounting_ledger (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      gateway_id TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      gross_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      gateway_fee INTEGER NOT NULL DEFAULT 0,
      shipping_cost INTEGER NOT NULL DEFAULT 0,
      vat_tax_amount INTEGER NOT NULL DEFAULT 0,
      net_profit INTEGER NOT NULL DEFAULT 0,
      invoice_serial TEXT NOT NULL,
      buyer_economic_code TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // 4. mod_forms_definitions & mod_forms_submissions (Gravity-Style Form Builder)
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_forms_definitions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title_fa TEXT NOT NULL,
      steps_json TEXT NOT NULL DEFAULT '[]',
      conditional_logic_json TEXT NOT NULL DEFAULT '[]',
      pricing_formula TEXT NOT NULL DEFAULT '',
      honeypot_enabled INTEGER NOT NULL DEFAULT 1,
      sms_notify_enabled INTEGER NOT NULL DEFAULT 1,
      payment_gateway_linked INTEGER NOT NULL DEFAULT 0,
      submissions_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_forms_submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      submitter_phone TEXT,
      submitter_national_id TEXT,
      province_city TEXT,
      calculated_price INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )
  `);

  // 5. mod_ecommerce_shipments, mod_ecommerce_stock_alerts, mod_ecommerce_wallets
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ecommerce_shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      carrier_code TEXT NOT NULL DEFAULT 'post_pishtaz',
      tracking_code TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'dispatched',
      sms_notified INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ecommerce_stock_alerts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_title TEXT NOT NULL,
      phone TEXT NOT NULL,
      notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ecommerce_wallets (
      phone TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      balance_toman INTEGER NOT NULL DEFAULT 0,
      cashback_percent REAL NOT NULL DEFAULT 5,
      total_cashback_earned INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `);

  // Seed Payzito Payment Hub Drivers
  const drvCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_payment_hub_drivers'
  );
  if (Number(drvCount[0]?.cnt || 0) === 0) {
    for (const d of INITIAL_PAYZITO_DRIVERS) {
      await dbExec(
        `INSERT INTO mod_payment_hub_drivers
         (id, gateway_kind, title_fa, provider_code, enabled, sandbox_mode, cash_discount_percent, bnpl_fee_percent, installments_count, credentials_json, sort_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          d.id,
          d.gatewayKind,
          d.titleFa,
          d.providerCode,
          d.enabled ? 1 : 0,
          d.sandboxMode ? 1 : 0,
          d.cashDiscountPercent,
          d.bnplFeePercent,
          d.installmentsCount,
          JSON.stringify(d.credentialsJson),
          d.sortOrder,
          nowIso,
        ]
      );
    }
  }

  // Seed Inventory Stock & Initial Accounting Ledger Entry
  const invCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_inventory_stock'
  );
  if (Number(invCount[0]?.cnt || 0) === 0) {
    const sampleStock = [
      { id: 'pkg-enterprise-fullstack-dongle', sku: 'SK98-HW-01', title: 'پکیج سازمانی Enterprise + دانگل سخت‌افزاری فیزیکی', qty: 14, reserved: 2, threshold: 5, digital: 0 },
      { id: 'pkg-ai-architect-suite', sku: 'SK98-VIP-02', title: 'پکیج جامع معمار هوش مصنوعی و استقرار سازمانی', qty: 45, reserved: 1, threshold: 10, digital: 0 },
      { id: 'skill-gsap-motion-mastery', sku: 'SK98-DIG-03', title: 'اسکیل مهندسی انیمیشن‌های GSAP و تایم‌لاین', qty: 999, reserved: 0, threshold: 5, digital: 1 },
    ];
    for (const s of sampleStock) {
      await dbExec(
        `INSERT INTO mod_inventory_stock (product_id, sku, product_title, stock_qty, reserved_qty, low_stock_threshold, is_unlimited_digital, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (product_id) DO NOTHING`,
        [s.id, s.sku, s.title, s.qty, s.reserved, s.threshold, s.digital, nowIso]
      );
    }
  }

  const ledCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_accounting_ledger'
  );
  if (Number(ledCount[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_accounting_ledger
       (id, order_id, buyer_name, gateway_id, payment_mode, gross_amount, discount_amount, gateway_fee, shipping_cost, vat_tax_amount, net_profit, invoice_serial, buyer_economic_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        'led_1404_01',
        'ord_982101',
        'شرکت توسعه فناوری پیشرو',
        'snapppay',
        'bnpl_4x',
        4800000,
        240000,
        45600,
        85000,
        456000,
        3973400,
        'INV-1404-982101',
        '411589632147',
        nowIso,
      ]
    );
  }

  // Seed Gravity-Style Multi-Step Form Definition
  const formCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_forms_definitions'
  );
  if (Number(formCount[0]?.cnt || 0) === 0) {
    const steps = [
      { step: 1, title: 'مشخصات هویتی و سازمانی (بومی ایران)', fields: ['full_name', 'national_id', 'phone', 'province_city', 'postal_code'] },
      { step: 2, title: 'انتخاب سرویس، منطق شرطی و محاسبه قیمت', fields: ['service_type', 'team_size', 'need_official_invoice', 'calculated_total'] },
    ];
    const condLogic = [
      { ifField: 'need_official_invoice', equals: 'yes', showFields: ['economic_code', 'company_national_id'], addPercent: 10 },
    ];
    await dbExec(
      `INSERT INTO mod_forms_definitions
       (id, slug, title_fa, steps_json, conditional_logic_json, pricing_formula, honeypot_enabled, sms_notify_enabled, payment_gateway_linked, submissions_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        'form_enterprise_quote',
        'enterprise-license-request',
        'فرم چندمرحله‌ای استعلام قیمت و سفارش لایسنس سازمانی',
        JSON.stringify(steps),
        JSON.stringify(condLogic),
        'base_price + (team_size * 450000)',
        1,
        1,
        1,
        1,
        nowIso,
      ]
    );
    await dbExec(
      `INSERT INTO mod_forms_submissions
       (id, form_id, submitter_phone, submitter_national_id, province_city, calculated_price, payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        'sub_101',
        'form_enterprise_quote',
        '09123456789',
        '0013542419',
        'تهران - تهران',
        6900000,
        JSON.stringify({ company: 'هلدینگ داده‌پردازی پارس', teamSize: 12, officialInvoice: true }),
        nowIso,
      ]
    );
  }

  // Seed Shipment & Wallet
  const shpCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_ecommerce_shipments'
  );
  if (Number(shpCount[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_ecommerce_shipments
       (id, order_id, carrier_code, tracking_code, recipient_name, recipient_phone, destination_city, postal_code, status, sms_notified, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        'shp_1404_01',
        'ord_982101',
        'tipax',
        'TPX-6482910455',
        'مهندس آرش رادمنش',
        '09123456789',
        'تهران - سعادت‌آباد',
        '1998745631',
        'in_transit',
        1,
        nowIso,
      ]
    );
  }
}
