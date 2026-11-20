# نقشه جامع معماری و گراف وابستگی پروژه (PROJECT_MAP)

- **نسخه هسته:** `v2.7.0`
- **زمان تولید گراف:** `2026-11-20T14:49:58.970Z`
- **تعداد کل فایل‌های اسکن‌شده:** `203`
- **مجموع خطوط کد:** `78108`
- **تعداد اندپوینت‌های API:** `212`
- **تعداد جداول دیتابیس SQL:** `69`

## ۱. جداول دیتابیس (SQL Tables)
- `mod_payment_hub_drivers`
- `mod_inventory_stock`
- `mod_inventory_reservations`
- `mod_accounting_ledger`
- `mod_forms_definitions`
- `mod_forms_submissions`
- `mod_ecommerce_shipments`
- `mod_ecommerce_stock_alerts`
- `mod_ecommerce_wallets`
- `mod_live_chat_sessions`
- `mod_live_chat_messages`
- `mod_analytics_events`
- `mod_analytics_province_sales`
- `mod_gsc_keywords`
- `mod_ai_digikala_imports`
- `mod_seo_redirects`
- `mod_booking_slots`
- `mod_booking_appointments`
- `mod_auto_backup_archives`
- `users`
- `products`
- `articles`
- `orders`
- `coupons`
- `media_items`
- `payment_gateways`
- `sms_triggers`
- `site_settings`
- `system_logs`
- `backup_history`
- `auth_sessions`
- `rbac_permission_hashes`
- `taxonomies`
- `pages`
- `menus`
- `invoice_templates`
- `mod_abandoned_carts`
- `mod_academy_departments`
- `mod_academy_courses`
- `mod_academy_announcements`
- `mod_academy_ideas`
- `mod_academy_consultations`
- `mod_affiliate_partners`
- `mod_affiliate_clicks`
- `mod_affiliate_commissions`
- `mod_ai_provider_configs`
- `mod_ai_agent_skills`
- `mod_ai_agent_tasks`
- `mod_ai_agent_conversations`
- `mod_ai_approval_queue`
- `mod_web_vitals`
- `mod_announcements_popups`
- `mod_b2b_tiers`
- `mod_b2b_quotes`
- `mod_bot_channels`
- `mod_outbound_webhooks`
- `mod_delivery_logs`
- `mod_i18n_translations`
- `mod_audit_trail`
- `mod_pwa_subscriptions`
- `mod_pwa_notifications`
- `mod_product_reviews`
- `mod_product_qa`
- `mod_crm_rules`
- `mod_crm_recommendations`
- `mod_subscription_plans`
- `mod_user_subscriptions`
- `mod_wallet_transactions`
- `mod_rma_requests`

## ۲. اندپوینت‌های سرور (API Endpoints)
| متد | مسیر API | فایل ماژول |
| :--- | :--- | :--- |
| `GET` | `*` | `server.ts` |
| `GET` | `/api/v1/captcha/challenge` | `src/server/core/captchaService.ts` |
| `POST` | `/api/v1/captcha/verify` | `src/server/core/captchaService.ts` |
| `GET` | `/api/admin/db/status` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/db/test-connection` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/db/query` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `GET` | `/api/admin/backup/history` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/backup/create` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `GET` | `/api/admin/backup/download/:id` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/backup/restore` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/backup/settings` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/backup/test-bale` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `POST` | `/api/admin/backup/test-smtp` | `src/server/modules/admin/adminDbBackupRouter.ts` |
| `GET` | `/api/admin/sms/config` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `POST` | `/api/admin/sms/config` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `POST` | `/api/admin/sms/test` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `GET` | `/api/admin/payment/config` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `POST` | `/api/admin/payment/config` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `POST` | `/api/admin/payment/test-router` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `GET` | `/api/admin/payment/router-php` | `src/server/modules/admin/adminGatewaysSmsRouter.ts` |
| `GET` | `/api/admin/logs` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `DELETE` | `/api/admin/logs` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `POST` | `/api/admin/logs/snooze` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `GET` | `/api/admin/logs/export-csv` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `POST` | `/api/admin/logs/diagnostics` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `GET` | `/api/admin/permissions/hashes` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `POST` | `/api/admin/permissions/resync` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `GET` | `/api/admin/users` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `POST` | `/api/admin/users` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `PATCH` | `/api/admin/users/:phone` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `DELETE` | `/api/admin/users/:phone` | `src/server/modules/admin/adminUsersLogsRouter.ts` |
| `POST` | `/api/admin/maintenance/clean-demo` | `src/server/modules/admin/maintenanceCleanersRouter.ts` |
| `GET` | `/api/admin/maintenance/orphan-media` | `src/server/modules/admin/maintenanceCleanersRouter.ts` |
| `POST` | `/api/admin/maintenance/orphan-media/clean` | `src/server/modules/admin/maintenanceCleanersRouter.ts` |
| `GET` | `/api/v1/modules/registry` | `src/server/modules/admin/modulesConfigRouter.ts` |
| `POST` | `/api/v1/modules/registry` | `src/server/modules/admin/modulesConfigRouter.ts` |
| `GET` | `/api/admin/permissions/matrix` | `src/server/modules/admin/rbacMatrixRouter.ts` |
| `POST` | `/api/admin/permissions/matrix` | `src/server/modules/admin/rbacMatrixRouter.ts` |
| `POST` | `/api/cms/ai-assist` | `src/server/modules/ai/aiSeoRouter.ts` |
| `POST` | `/api/auth/check-phone` | `src/server/modules/auth/authRouter.ts` |
| `POST` | `/api/sms/send-otp` | `src/server/modules/auth/authRouter.ts` |
| `POST` | `/api/sms/verify-otp` | `src/server/modules/auth/authRouter.ts` |
| `POST` | `/api/auth/google-session` | `src/server/modules/auth/authRouter.ts` |
| `POST` | `/api/auth/master-code` | `src/server/modules/auth/authRouter.ts` |
| `GET` | `/api/auth/session` | `src/server/modules/auth/authRouter.ts` |
| `GET` | `/api/auth/sessions` | `src/server/modules/auth/authRouter.ts` |
| `DELETE` | `/api/auth/sessions/:id` | `src/server/modules/auth/authRouter.ts` |
| `POST` | `/api/auth/logout` | `src/server/modules/auth/authRouter.ts` |
| `GET` | `/api/v1/taxonomies` | `src/server/modules/catalog/taxonomiesPaginationRouter.ts` |
| `POST` | `/api/v1/taxonomies` | `src/server/modules/catalog/taxonomiesPaginationRouter.ts` |
| `DELETE` | `/api/v1/taxonomies/:id` | `src/server/modules/catalog/taxonomiesPaginationRouter.ts` |
| `GET` | `/api/v1/catalog/paginated` | `src/server/modules/catalog/taxonomiesPaginationRouter.ts` |
| `POST` | `/api/v1/catalog/bulk` | `src/server/modules/catalog/taxonomiesPaginationRouter.ts` |
| `GET` | `/api/v1/pages` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `GET` | `/api/v1/pages/:slug` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `POST` | `/api/v1/pages` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `DELETE` | `/api/v1/pages/:id` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `GET` | `/api/v1/menus` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `POST` | `/api/v1/menus` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `POST` | `/api/v1/menus/reorder` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `DELETE` | `/api/v1/menus/:id` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `GET` | `/api/v1/invoice-templates` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `POST` | `/api/v1/invoice-templates` | `src/server/modules/cms/pagesMenusComposerRouter.ts` |
| `POST` | `/api/v1/downloads/upload` | `src/server/modules/downloads/downloadsRouter.ts` |
| `GET` | `/api/v1/downloads/my-library` | `src/server/modules/downloads/downloadsRouter.ts` |
| `POST` | `/api/v1/downloads/token` | `src/server/modules/downloads/downloadsRouter.ts` |
| `GET` | `/api/v1/downloads/stream/:token` | `src/server/modules/downloads/downloadsRouter.ts` |
| `POST` | `/api/v1/media/upload` | `src/server/modules/media/mediaEngineRouter.ts` |
| `POST` | `/api/v1/media/migrate-base64` | `src/server/modules/media/mediaEngineRouter.ts` |
| `POST` | `/api/orders/create` | `src/server/modules/orders/ordersRouter.ts` |
| `PATCH` | `/api/orders/:id/status` | `src/server/modules/orders/ordersRouter.ts` |
| `POST` | `/api/payment/request` | `src/server/modules/orders/ordersRouter.ts` |
| `POST` | `/api/payment/verify` | `src/server/modules/orders/ordersRouter.ts` |
| `GET` | `/api/health` | `src/server/modules/storefront/storefrontRouter.ts` |
| `GET` | `/api/storefront/bootstrap` | `src/server/modules/storefront/storefrontRouter.ts` |
| `POST` | `/api/cms/state/sync` | `src/server/modules/storefront/storefrontRouter.ts` |
| `GET` | `/api/user/profile` | `src/server/modules/storefront/storefrontRouter.ts` |
| `POST` | `/api/user/claim-skill` | `src/server/modules/storefront/storefrontRouter.ts` |
| `POST` | `/api/v1/modules/abandoned-cart/heartbeat` | `modules/mod_abandoned_cart/abandonedCartRouter.ts` |
| `GET` | `/api/v1/modules/abandoned-cart/list` | `modules/mod_abandoned_cart/abandonedCartRouter.ts` |
| `POST` | `/api/v1/modules/abandoned-cart/:id/recover` | `modules/mod_abandoned_cart/abandonedCartRouter.ts` |
| `GET` | `/api/v1/modules/academy/bootstrap` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/admin/overview` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/departments` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/academy/departments` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `DELETE` | `/api/v1/modules/academy/departments/:id` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/courses` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/academy/courses` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `DELETE` | `/api/v1/modules/academy/courses/:id` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/announcements` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/academy/announcements` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `DELETE` | `/api/v1/modules/academy/announcements/:id` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/ideas` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/academy/ideas` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `PATCH` | `/api/v1/modules/academy/ideas/:id` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `DELETE` | `/api/v1/modules/academy/ideas/:id` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/academy/consultations` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `GET` | `/api/v1/modules/academy/settings` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `PUT` | `/api/v1/modules/academy/settings` | `modules/mod_academy_suite/academySuiteRouter.ts` |
| `POST` | `/api/v1/modules/affiliate/track-click` | `modules/mod_affiliate/affiliateRouter.ts` |
| `GET` | `/api/v1/modules/affiliate/overview` | `modules/mod_affiliate/affiliateRouter.ts` |
| `POST` | `/api/v1/modules/affiliate/partners` | `modules/mod_affiliate/affiliateRouter.ts` |
| `POST` | `/api/v1/modules/affiliate/commissions/:id/payout` | `modules/mod_affiliate/affiliateRouter.ts` |
| `GET` | `/api/v1/modules/ai-digikala/history` | `modules/mod_ai_digikala/aiDigikalaRouter.ts` |
| `POST` | `/api/v1/modules/ai-digikala/import` | `modules/mod_ai_digikala/aiDigikalaRouter.ts` |
| `POST` | `/api/v1/modules/ai-digikala/score` | `modules/mod_ai_digikala/aiDigikalaRouter.ts` |
| `GET` | `/api/v1/modules/ai-hub/agent/overview` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/mode` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/command` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/skills` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `DELETE` | `/api/v1/modules/ai-hub/agent/skills/:id` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/tasks/:id/run` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/approvals/:id/decide` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/agent/bot-bridge/test` | `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` |
| `GET` | `/api/v1/modules/ai-hub/config` | `modules/mod_ai_hub_agent/aiHubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/slots/save` | `modules/mod_ai_hub_agent/aiHubRouter.ts` |
| `POST` | `/api/v1/modules/ai-hub/image-studio` | `modules/mod_ai_hub_agent/aiHubRouter.ts` |
| `POST` | `/api/v1/modules/analytics/track` | `modules/mod_analytics_gsc/analyticsGscRouter.ts` |
| `GET` | `/api/v1/modules/analytics/overview` | `modules/mod_analytics_gsc/analyticsGscRouter.ts` |
| `POST` | `/api/v1/modules/analytics/vitals` | `modules/mod_analytics_gsc/analyticsGscRouter.ts` |
| `POST` | `/api/v1/modules/analytics/gsc-sync` | `modules/mod_analytics_gsc/analyticsGscRouter.ts` |
| `GET` | `/api/v1/modules/announcements/active` | `modules/mod_announcements_popups/announcementsPopupsRouter.ts` |
| `GET` | `/api/v1/modules/announcements` | `modules/mod_announcements_popups/announcementsPopupsRouter.ts` |
| `POST` | `/api/v1/modules/announcements` | `modules/mod_announcements_popups/announcementsPopupsRouter.ts` |
| `DELETE` | `/api/v1/modules/announcements/:id` | `modules/mod_announcements_popups/announcementsPopupsRouter.ts` |
| `GET` | `/api/v1/modules/auto-backup/archives` | `modules/mod_auto_backup/autoBackupRouter.ts` |
| `POST` | `/api/v1/modules/auto-backup/run-encrypted` | `modules/mod_auto_backup/autoBackupRouter.ts` |
| `GET` | `/api/v1/modules/b2b-compare/compare` | `modules/mod_b2b_compare/b2bCompareRouter.ts` |
| `POST` | `/api/v1/modules/b2b-compare/quote` | `modules/mod_b2b_compare/b2bCompareRouter.ts` |
| `GET` | `/api/v1/modules/b2b-compare/admin/overview` | `modules/mod_b2b_compare/b2bCompareRouter.ts` |
| `POST` | `/api/v1/modules/b2b-compare/admin/tiers` | `modules/mod_b2b_compare/b2bCompareRouter.ts` |
| `DELETE` | `/api/v1/modules/b2b-compare/admin/tiers/:id` | `modules/mod_b2b_compare/b2bCompareRouter.ts` |
| `GET` | `/api/v1/modules/booking/slots` | `modules/mod_booking/solarBookingRouter.ts` |
| `POST` | `/api/v1/modules/booking/slots` | `modules/mod_booking/solarBookingRouter.ts` |
| `POST` | `/api/v1/modules/booking/appointments` | `modules/mod_booking/solarBookingRouter.ts` |
| `GET` | `/api/v1/modules/bots-webhooks/overview` | `modules/mod_bots_webhooks/botsWebhooksRouter.ts` |
| `POST` | `/api/v1/modules/bots-webhooks/bot` | `modules/mod_bots_webhooks/botsWebhooksRouter.ts` |
| `POST` | `/api/v1/modules/bots-webhooks/bot/:id/test` | `modules/mod_bots_webhooks/botsWebhooksRouter.ts` |
| `POST` | `/api/v1/modules/bots-webhooks/webhook` | `modules/mod_bots_webhooks/botsWebhooksRouter.ts` |
| `POST` | `/api/v1/modules/bots-webhooks/webhook/:id/test` | `modules/mod_bots_webhooks/botsWebhooksRouter.ts` |
| `GET` | `/api/v1/modules/delivery-logs` | `modules/mod_delivery_logs/deliveryLogsRouter.ts` |
| `DELETE` | `/api/v1/modules/delivery-logs/clear` | `modules/mod_delivery_logs/deliveryLogsRouter.ts` |
| `GET` | `/api/v1/feeds/torob` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `GET` | `/api/v1/feeds/emalls` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `GET` | `/api/v1/modules/ecommerce/shipments` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `POST` | `/api/v1/modules/ecommerce/shipments` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `POST` | `/api/v1/modules/ecommerce/stock-alerts` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `GET` | `/api/v1/modules/ecommerce/official-invoice/:orderId` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `GET` | `/api/v1/modules/ecommerce/shipping-config` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `PUT` | `/api/v1/modules/ecommerce/shipping-config` | `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` |
| `GET` | `/api/v1/modules/forms` | `modules/mod_forms/formsEngineRouter.ts` |
| `POST` | `/api/v1/modules/forms` | `modules/mod_forms/formsEngineRouter.ts` |
| `POST` | `/api/v1/modules/forms/:id/submit` | `modules/mod_forms/formsEngineRouter.ts` |
| `GET` | `/api/v1/modules/forms/:id/export.csv` | `modules/mod_forms/formsEngineRouter.ts` |
| `GET` | `/api/v1/modules/forms/:id/submissions` | `modules/mod_forms/formsEngineRouter.ts` |
| `DELETE` | `/api/v1/modules/forms/:id` | `modules/mod_forms/formsEngineRouter.ts` |
| `DELETE` | `/api/v1/modules/forms/submissions/:subId` | `modules/mod_forms/formsEngineRouter.ts` |
| `GET` | `/api/v1/modules/i18n/dictionary` | `modules/mod_i18n/i18nRouter.ts` |
| `GET` | `/api/v1/modules/i18n/admin/list` | `modules/mod_i18n/i18nRouter.ts` |
| `POST` | `/api/v1/modules/i18n/admin/save` | `modules/mod_i18n/i18nRouter.ts` |
| `GET` | `/api/v1/modules/inventory/stock` | `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` |
| `POST` | `/api/v1/modules/inventory/stock` | `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` |
| `POST` | `/api/v1/modules/inventory/reserve` | `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` |
| `GET` | `/api/v1/modules/accounting/ledger` | `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` |
| `POST` | `/api/v1/modules/accounting/ledger` | `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` |
| `GET` | `/api/v1/modules/live-chat/status` | `modules/mod_live_chat/liveChatRouter.ts` |
| `GET` | `/api/v1/modules/live-chat/admin/unread-summary` | `modules/mod_live_chat/liveChatRouter.ts` |
| `POST` | `/api/v1/modules/live-chat/link-session` | `modules/mod_live_chat/liveChatRouter.ts` |
| `POST` | `/api/v1/modules/live-chat/visitor-message` | `modules/mod_live_chat/liveChatRouter.ts` |
| `GET` | `/api/v1/modules/live-chat/admin/inbox` | `modules/mod_live_chat/liveChatRouter.ts` |
| `POST` | `/api/v1/modules/live-chat/admin/priority` | `modules/mod_live_chat/liveChatRouter.ts` |
| `POST` | `/api/v1/modules/live-chat/admin/reply` | `modules/mod_live_chat/liveChatRouter.ts` |
| `POST` | `/api/v1/modules/live-chat/admin/create-thread` | `modules/mod_live_chat/liveChatRouter.ts` |
| `DELETE` | `/api/v1/modules/live-chat/admin/session/:id` | `modules/mod_live_chat/liveChatRouter.ts` |
| `GET` | `/api/v1/modules/maintenance/status` | `modules/mod_maintenance_audit/maintenanceAuditRouter.ts` |
| `GET` | `/api/v1/modules/maintenance/admin/overview` | `modules/mod_maintenance_audit/maintenanceAuditRouter.ts` |
| `POST` | `/api/v1/modules/maintenance/admin/config` | `modules/mod_maintenance_audit/maintenanceAuditRouter.ts` |
| `GET` | `/api/v1/modules/pwa/public-key` | `modules/mod_notifications_pwa/notificationsPwaRouter.ts` |
| `POST` | `/api/v1/modules/pwa/subscribe` | `modules/mod_notifications_pwa/notificationsPwaRouter.ts` |
| `GET` | `/api/v1/modules/pwa/admin/overview` | `modules/mod_notifications_pwa/notificationsPwaRouter.ts` |
| `POST` | `/api/v1/modules/pwa/admin/rotate-vapid` | `modules/mod_notifications_pwa/notificationsPwaRouter.ts` |
| `POST` | `/api/v1/modules/pwa/admin/broadcast` | `modules/mod_notifications_pwa/notificationsPwaRouter.ts` |
| `GET` | `/api/v1/modules/payment-hub/drivers` | `modules/mod_payment_hub/paymentHubRouter.ts` |
| `POST` | `/api/v1/modules/payment-hub/drivers` | `modules/mod_payment_hub/paymentHubRouter.ts` |
| `POST` | `/api/v1/modules/payment-hub/calculate` | `modules/mod_payment_hub/paymentHubRouter.ts` |
| `GET` | `/api/v1/modules/reviews-qa/product/:productId` | `modules/mod_reviews_qa/reviewsQaRouter.ts` |
| `POST` | `/api/v1/modules/reviews-qa/review` | `modules/mod_reviews_qa/reviewsQaRouter.ts` |
| `POST` | `/api/v1/modules/reviews-qa/question` | `modules/mod_reviews_qa/reviewsQaRouter.ts` |
| `GET` | `/api/v1/modules/reviews-qa/admin/list` | `modules/mod_reviews_qa/reviewsQaRouter.ts` |
| `POST` | `/api/v1/modules/reviews-qa/admin/moderate` | `modules/mod_reviews_qa/reviewsQaRouter.ts` |
| `GET` | `/api/v1/seo/visibility` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `PUT` | `/api/v1/modules/seo-redirects/visibility` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/sitemap.xml` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/robots.txt` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/llms.txt` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/llm.txt` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/api/v1/modules/seo-redirects/rules` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `POST` | `/api/v1/modules/seo-redirects/rules` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `DELETE` | `/api/v1/modules/seo-redirects/rules/:id` | `modules/mod_seo_redirects/seoRedirectsRouter.ts` |
| `GET` | `/api/v1/modules/smart-crm/admin/overview` | `modules/mod_smart_crm/smartCrmRouter.ts` |
| `POST` | `/api/v1/modules/smart-crm/admin/rules` | `modules/mod_smart_crm/smartCrmRouter.ts` |
| `POST` | `/api/v1/modules/smart-crm/admin/run-auto-match` | `modules/mod_smart_crm/smartCrmRouter.ts` |
| `GET` | `/api/v1/modules/smart-crm/my-recommendations` | `modules/mod_smart_crm/smartCrmRouter.ts` |
| `GET` | `/api/v1/modules/subscriptions/plans` | `modules/mod_subscriptions/subscriptionsRouter.ts` |
| `GET` | `/api/v1/modules/subscriptions/admin/overview` | `modules/mod_subscriptions/subscriptionsRouter.ts` |
| `POST` | `/api/v1/modules/subscriptions/admin/plans` | `modules/mod_subscriptions/subscriptionsRouter.ts` |
| `GET` | `/api/v1/modules/subscriptions/my-status` | `modules/mod_subscriptions/subscriptionsRouter.ts` |
| `POST` | `/api/v1/modules/subscriptions/subscribe` | `modules/mod_subscriptions/subscriptionsRouter.ts` |
| `GET` | `/api/v1/modules/wallet-rma/overview` | `modules/mod_wallet_rma/walletRmaRouter.ts` |
| `POST` | `/api/v1/modules/wallet-rma/transaction` | `modules/mod_wallet_rma/walletRmaRouter.ts` |
| `POST` | `/api/v1/modules/wallet-rma/rma` | `modules/mod_wallet_rma/walletRmaRouter.ts` |
| `POST` | `/api/v1/modules/wallet-rma/rma/:id/resolve` | `modules/mod_wallet_rma/walletRmaRouter.ts` |

## ۳. تفکیک فایل‌ها بر اساس لایه معماری
| مسیر فایل | لایه | تعداد خط | خروجی‌ها (Exports) |
| :--- | :--- | :--- | :--- |
| `server.ts` | `root` | 231 | — |
| `src/App.tsx` | `root` | 2526 | — |
| `src/barba.d.ts` | `root` | 29 | — |
| `src/components/OfflineCaptchaWidget.tsx` | `root` | 90 | OfflineCaptchaWidget |
| `src/core/apiClient.ts` | `core` | 81 | StoredClientSession, readStoredSession, writeStoredSession, getAuthHeaders, buildAuthHeaders, apiFetch |
| `src/core/iran-geo.ts` | `core` | 87 | IranProvinceEntry, IRAN_PROVINCES_AND_CITIES, getCitiesByProvince, isValidIranNationalId, isValidIranPostalCode, isValidIranMobile |
| `src/core/jalali.ts` | `core` | 156 | JalaliDateParts, GregorianDateParts, JALALI_MONTH_NAMES, toPersianDigits, toEnglishDigits, gregorianToJalali |
| `src/core/motionAndDragEngine.ts` | `core` | 560 | scrollToTopImmediate, scrollToElementSmooth, initSmoothScroll, pauseSmoothScroll, resumeSmoothScroll, triggerBarbaGsapTransition |
| `src/core/permissions.ts` | `core` | 100 | ALL_CAPABILITY_KEYS, CAPABILITY_LABELS_FA, EMPTY_ROLE_PERMISSIONS, FULL_ROLE_PERMISSIONS, resolveEffectivePermissions, canUserUseAiSeo |
| `src/core/rbacMatrix.ts` | `core` | 85 | GranularActionKey, GranularActionSet, GranularResourceMeta, GRANULAR_ACTIONS, GRANULAR_RBAC_RESOURCES, GranularRbacMatrix |
| `src/core/types.ts` | `core` | 688 | AccentPresetId, AIToolCategory, PosterColorScheme, UserRoleType, ActiveTab, CatalogFilter |
| `src/core/webVitalsReporter.ts` | `core` | 65 | initWebVitalsReporter |
| `src/core/zipGenerator.ts` | `core` | 89 | downloadSkill98StarterZip, downloadSingleSkillFile |
| `src/data/defaults.ts` | `root` | 643 | APP_VERSION, IMAGES, resolveStaticImageUrl, INITIAL_MEDIA_LIBRARY, BRAND_LOGO_PRESETS, BRAND_FAVICON_PRESETS |
| `src/data/initialCatalog.ts` | `root` | 1172 | INITIAL_SKILL98_CATALOG, createInteractiveMuuriGrid, revealStoreCards, INITIAL_ARTICLES, TARGET_ARCHITECTURE_GUIDE, STARTER_KIT_FILES |
| `src/data/mediaAssets.ts` | `root` | 104 | VITE_IMAGES, resolveStaticImageUrl, ResponsiveImageSlot, resolveResponsiveMediaUrl, isVideoMediaUrl |
| `src/data/skill98Data.ts` | `root` | 6 | — |
| `src/data/verifiedSkillsCatalog.ts` | `root` | 1178 | serverConfig, DialogSurface, products, useCartStore, generateMetadata, appRouter |
| `src/firebase.ts` | `root` | 102 | db, auth, googleProvider, BOOTSTRAPPED_ADMIN_EMAIL, OperationType, FirestoreErrorInfo |
| `src/index.css` | `root` | 354 | — |
| `src/main.tsx` | `root` | 6 | — |
| `src/modules/admin/AdminCmsView.tsx` | `modules` | 1307 | AdminSection, AdminCmsView |
| `src/modules/admin/components/MaintenanceCleanersCard.tsx` | `modules` | 280 | MaintenanceCleanersCard |
| `src/modules/admin/components/MediaPickerModal.tsx` | `modules` | 553 | MediaPickerSelection, MediaPickerModal |
| `src/modules/admin/components/RbacMatrixEditorCard.tsx` | `modules` | 211 | RbacMatrixEditorCard |
| `src/modules/admin/components/RichTextEditorToolbar.tsx` | `modules` | 144 | RichTextEditorToolbar, skillReady |
| `src/modules/admin/components/SeoVisibilityControlCard.tsx` | `modules` | 320 | SeoVisibilityControlCard |
| `src/modules/admin/components/ServerPaginationBulkBar.tsx` | `modules` | 271 | BulkActionOption, ServerPaginationBulkBar |
| `src/modules/admin/components/VisualComposerCanvas.tsx` | `modules` | 896 | ComposerContentSummaryContext, VisualComposerCanvas |
| `src/modules/admin/components/VisualComposerRenderer.tsx` | `modules` | 721 | WidgetCatalogEntry, COMPOSER_WIDGET_CATALOG, VisualComposerRenderer |
| `src/modules/admin/panels/AiSessionsThemePanel.tsx` | `modules` | 816 | AiSessionsThemePanel |
| `src/modules/admin/panels/ArticlesSeoPanel.tsx` | `modules` | 981 | ArticlesSeoPanel |
| `src/modules/admin/panels/CatalogEditorPanel.tsx` | `modules` | 1615 | ProductEditorDraft, createEmptyProductDraft, productToDraft, computeSeoScore, CatalogEditorPanel |
| `src/modules/admin/panels/DbBackupPanel.tsx` | `modules` | 1074 | DbBackupPanel |
| `src/modules/admin/panels/EnterpriseCoreHubPanel.tsx` | `modules` | 610 | EnterpriseHubMode, EnterpriseCoreHubPanel |
| `src/modules/admin/panels/LogsDiagnosticsPanel.tsx` | `modules` | 396 | LogsDiagnosticsPanel |
| `src/modules/admin/panels/MediaLibraryPanel.tsx` | `modules` | 799 | MediaLibraryPanel |
| `src/modules/admin/panels/MenuBuilderInvoicePanel.tsx` | `modules` | 733 | MenuBuilderInvoicePanel |
| `src/modules/admin/panels/ModulesControlCenterPanel.tsx` | `modules` | 327 | ModulesControlCenterPanel |
| `src/modules/admin/panels/OrdersCouponsPanel.tsx` | `modules` | 267 | OrdersCouponsPanel |
| `src/modules/admin/panels/PageBuilderPanel.tsx` | `modules` | 721 | PageBuilderPanel |
| `src/modules/admin/panels/PagesManagerPanel.tsx` | `modules` | 522 | PagesManagerPanel |
| `src/modules/admin/panels/PaymentGatewaysPanel.tsx` | `modules` | 681 | PaymentGatewaysPanel |
| `src/modules/admin/panels/RbacPermissionsPanel.tsx` | `modules` | 563 | RbacPermissionsPanel |
| `src/modules/admin/panels/SmsTriggersPanel.tsx` | `modules` | 926 | SmsTriggersPanel |
| `src/modules/admin/panels/TaxonomiesManagerPanel.tsx` | `modules` | 459 | TaxonomiesManagerPanel |
| `src/modules/admin/panels/UnifiedSettingsHubPanel.tsx` | `modules` | 821 | UnifiedSettingsTabId, UnifiedSettingsHubPanel |
| `src/modules/admin/panels/UsersDirectoryPanel.tsx` | `modules` | 706 | UsersDirectoryPanel |
| `src/modules/auth/AuthModal.tsx` | `modules` | 256 | AuthStep, toLatinDigits, formatLivePhoneInput, normalizeIranMobile, normalizeDigits, AuthModal |
| `src/modules/cart/CartDrawerModal.tsx` | `modules` | 542 | CartDrawerModal |
| `src/modules/catalog/SkillDetailModal.tsx` | `modules` | 193 | SkillDetailModal |
| `src/modules/dashboard/CustomerDashboardView.tsx` | `modules` | 1477 | CustomerDashboardView |
| `src/modules/guide/TargetGuideAndZipView.tsx` | `modules` | 308 | TargetGuideAndZipView |
| `src/server/core/cacheEngine.ts` | `core` | 96 | CacheEntry, CacheTelemetry, LruCacheEngine, cmsCache |
| `src/server/core/captchaService.ts` | `core` | 162 | generateOfflineCaptchaChallenge, verifyCaptchaToken, createCaptchaRouter |
| `src/server/core/cryptoSecurity.ts` | `core` | 168 | getAiClient, checkRateLimit, hashOtpCode, timingSafeHexEqual, resolveServerPort, getRequestBaseUrl |
| `src/server/core/envConfig.ts` | `core` | 124 | normalizeIranPhone, ServerEnvConfig, getEnvConfig |
| `src/server/core/permissionsEngine.ts` | `core` | 366 | PermissionsHashManifest, AuthenticatedRequest, computePermissionHash, syncPermissionsToDbAndFile, verifyRoleCapabilityHash, getHashedPermissionsReport |
| `src/server/core/secretVault.ts` | `core` | 72 | encryptSecret, decryptSecret, maskSecret, isMaskedPlaceholder |
| `src/server/database/backupService.ts` | `database` | 615 | getDatabaseStatus, runDatabaseReadWriteHealthTest, executeReadOnlySql, generateFullBackupPayload, sendSmtpBackupEmail, sendBaleNotification |
| `src/server/database/catalogOrdersRepo.ts` | `database` | 427 | getAllPaymentGateways, saveAllPaymentGateways, getAllSmsTriggers, saveAllSmsTriggers, getStorefrontBootstrapData, syncCmsEntities |
| `src/server/database/connection.ts` | `database` | 460 | SqlEngineKind, SqliteStatementLike, SqliteDbLike, DATA_DIR, BACKUP_DIR, SQLITE_PATH |
| `src/server/database/index.ts` | `database` | 65 | — |
| `src/server/database/phase3Seeds.ts` | `database` | 610 | INITIAL_DYNAMIC_PAGES, INITIAL_MENU_ITEMS, INITIAL_INVOICE_TEMPLATES, seedPhase3Tables |
| `src/server/database/phase5ModulesSchema.ts` | `database` | 326 | ModPaymentDriverRecord, INITIAL_PAYZITO_DRIVERS, createAndSeedPhase5ModulesSchema |
| `src/server/database/phase6ModulesSchema.ts` | `database` | 245 | createAndSeedPhase6ModulesSchema |
| `src/server/database/schema.ts` | `database` | 652 | initDatabase |
| `src/server/database/settingsLogsRepo.ts` | `database` | 119 | getSetting, setSetting, writeSystemLog, getSystemLogs, clearAllSystemLogs |
| `src/server/database/smsService.ts` | `database` | 498 | renderSmsTemplate, dispatchEventSms |
| `src/server/database/usersSessionsRepo.ts` | `database` | 347 | DbUserRow, DbAuthSessionRow, findUserByPhone, findUserByEmail, countSuperAdmins, upsertUserByPhone |
| `src/server/database.ts` | `root` | 2 | — |
| `src/server/middleware/authMiddleware.ts` | `root` | 43 | requireAdmin, requireSuperAdmin |
| `src/server/modules/admin/adminDbBackupRouter.ts` | `modules` | 273 | createAdminDbBackupRouter |
| `src/server/modules/admin/adminGatewaysSmsRouter.ts` | `modules` | 261 | createAdminGatewaysSmsRouter |
| `src/server/modules/admin/adminUsersLogsRouter.ts` | `modules` | 435 | createAdminUsersLogsRouter |
| `src/server/modules/admin/maintenanceCleanersRouter.ts` | `modules` | 213 | createMaintenanceCleanersRouter |
| `src/server/modules/admin/modulesConfigRouter.ts` | `modules` | 334 | DEFAULT_SITE_MODULES_REGISTRY, createModulesConfigRouter |
| `src/server/modules/admin/rbacMatrixRouter.ts` | `modules` | 158 | computeGranularMatrixHmac, createRbacMatrixRouter |
| `src/server/modules/ai/aiSeoRouter.ts` | `modules` | 120 | createAiSeoRouter |
| `src/server/modules/auth/authRouter.ts` | `modules` | 675 | createAuthRouter |
| `src/server/modules/catalog/taxonomiesPaginationRouter.ts` | `modules` | 418 | listAllTaxonomies, createTaxonomiesPaginationRouter |
| `src/server/modules/cms/pagesMenusComposerRouter.ts` | `modules` | 554 | createPagesMenusComposerRouter |
| `src/server/modules/downloads/downloadsRouter.ts` | `modules` | 419 | getProtectedDownloadsDir, createProtectedDownloadsRouter |
| `src/server/modules/media/mediaEngineRouter.ts` | `modules` | 379 | migrateDatabaseBase64ToPhysicalWebp, createMediaEngineRouter |
| `src/server/modules/orders/ordersRouter.ts` | `modules` | 534 | createOrdersRouter |
| `src/server/modules/storefront/storefrontRouter.ts` | `modules` | 191 | createStorefrontRouter |
| `src/theme/accentStyles.ts` | `theme` | 68 | AccentStyleTokens, getAccentStyles |
| `src/theme/components/ArticlesView.tsx` | `theme` | 768 | ArticlesView |
| `src/theme/components/DynamicPageView.tsx` | `theme` | 108 | DynamicPageView |
| `src/theme/components/MobileBottomNav.tsx` | `theme` | 131 | MobileBottomNav |
| `src/theme/components/ProgressiveImage.tsx` | `theme` | 72 | ProgressiveImage |
| `src/theme/components/ResilientImage.tsx` | `theme` | 42 | ResilientImage |
| `src/theme/components/SingleProductView.tsx` | `theme` | 416 | SingleProductView |
| `src/theme/components/SiteFooter.tsx` | `theme` | 320 | SiteFooter |
| `src/theme/components/SiteHeader.tsx` | `theme` | 370 | SiteHeader |
| `src/theme/components/SkillPosterCard.tsx` | `theme` | 773 | getPosterPalette, PosterGeometricSymbol, SkillPosterCard, HeroSkillDeckSlider |
| `src/theme/components/StorefrontView.tsx` | `theme` | 845 | StorefrontView |
| `core/agents/clean-code-checker.js` | `core` | 82 | runCleanCodeCheck |
| `core/agents/design-system-auditor.js` | `core` | 127 | runDesignSystemAudit |
| `core/agents/media-optimizer.d.ts` | `core` | 29 | OptimizeImageInput, OptimizeImageResult, optimizeAndStoreImageBuffer, auditMediaStorage |
| `core/agents/media-optimizer.js` | `core` | 100 | ALLOWED_IMAGE_MIMES, RESPONSIVE_SIZES, resolveUploadRootDir, getUploadMonthDir, optimizeAndStoreImageBuffer |
| `core/agents/project-indexer.js` | `core` | 190 | buildProjectGraph |
| `core/agents/security-auditor.js` | `core` | 115 | runSecurityAudit |
| `modules/mod_abandoned_cart/AbandonedCartPanel.tsx` | `modules` | 156 | AbandonedCartPanel |
| `modules/mod_abandoned_cart/abandonedCartRouter.ts` | `modules` | 161 | createAbandonedCartRouter |
| `modules/mod_academy_suite/AcademySuiteAdminPanel.tsx` | `modules` | 1018 | AcademySuiteAdminPanel |
| `modules/mod_academy_suite/academySeeds.ts` | `modules` | 993 | AcademyDepartmentItem, AcademyCourseItem, AcademyAnnouncementItem, AcademyIdeaItem, AcademyAgeRoadmapItem, AcademyTuitionSettings |
| `modules/mod_academy_suite/academySuiteRouter.ts` | `modules` | 729 | ensureAcademySuiteSchema, createModAcademySuiteRouter |
| `modules/mod_affiliate/AffiliatePanel.tsx` | `modules` | 152 | AffiliatePanel |
| `modules/mod_affiliate/affiliateRouter.ts` | `modules` | 137 | createAffiliateRouter |
| `modules/mod_ai_digikala/Phase6EnterpriseSuitePanel.tsx` | `modules` | 285 | Phase6EnterpriseSuitePanel |
| `modules/mod_ai_digikala/aiDigikalaRouter.ts` | `modules` | 230 | RankMathCheckItem, evaluateRankMathSeoScore, createModAiDigikalaRouter |
| `modules/mod_ai_hub_agent/AiCommandCenterCard.tsx` | `modules` | 327 | AiCommandCenterCard |
| `modules/mod_ai_hub_agent/AiHubAgentPanel.tsx` | `modules` | 222 | AiHubAgentPanel |
| `modules/mod_ai_hub_agent/AiImageStudioWidget.tsx` | `modules` | 202 | AiImageStudioWidget |
| `modules/mod_ai_hub_agent/AiScheduledTasksCard.tsx` | `modules` | 79 | AgentTaskItem, AiScheduledTasksCard |
| `modules/mod_ai_hub_agent/AiSkillsApprovalsCard.tsx` | `modules` | 234 | AiSkillsApprovalsCard |
| `modules/mod_ai_hub_agent/AiSlotsConfigCard.tsx` | `modules` | 245 | AiSlotItem, AiSlotsConfigCard |
| `modules/mod_ai_hub_agent/agentToolsEngine.ts` | `modules` | 307 | isGenericDisplayName, extractNameFromChatMessage, updateVisitorUserProfileTool, queueAgentApproval, dispatchAgentBotBridgeAlert, handleLiveChatAgentAutomation |
| `modules/mod_ai_hub_agent/aiAgentSubRouter.ts` | `modules` | 253 | registerSuperAdminAgentRoutes |
| `modules/mod_ai_hub_agent/aiHubRouter.ts` | `modules` | 182 | createAiHubAgentRouter |
| `modules/mod_ai_hub_agent/aiHubSchema.ts` | `modules` | 253 | AiSlotKey, AiProviderKind, AiSlotRow, AiHubRuntimeSettings, DEFAULT_AI_HUB_SETTINGS, ensureAiHubSchema |
| `modules/mod_ai_hub_agent/aiProviderGateway.ts` | `modules` | 280 | SlotGenerationResult, getSlotConfig, generateTextViaSlot, ImageStudioResult, generateImagePromptAndAsset |
| `modules/mod_analytics_gsc/NativeAnalyticsGscPanel.tsx` | `modules` | 264 | NativeAnalyticsGscPanel |
| `modules/mod_analytics_gsc/WebVitalsGa4Card.tsx` | `modules` | 90 | WebVitalsSummaryData, WebVitalsGa4Card |
| `modules/mod_analytics_gsc/analyticsGscRouter.ts` | `modules` | 232 | createModAnalyticsGscRouter |
| `modules/mod_announcements_popups/AnnouncementsPopupsPanel.tsx` | `modules` | 205 | AnnouncementsPopupsPanel |
| `modules/mod_announcements_popups/StorefrontPopupsRenderer.tsx` | `modules` | 131 | StorefrontPopupsRenderer |
| `modules/mod_announcements_popups/announcementsPopupsRouter.ts` | `modules` | 141 | createAnnouncementsPopupsRouter |
| `modules/mod_auto_backup/autoBackupRouter.ts` | `modules` | 156 | createModAutoBackupRouter |
| `modules/mod_b2b_compare/B2bComparePanel.tsx` | `modules` | 162 | B2bComparePanel |
| `modules/mod_b2b_compare/b2bCompareRouter.ts` | `modules` | 162 | createB2bCompareRouter |
| `modules/mod_booking/SolarBookingAutoBackupPanel.tsx` | `modules` | 303 | SolarBookingAutoBackupPanel |
| `modules/mod_booking/solarBookingRouter.ts` | `modules` | 162 | createModBookingRouter |
| `modules/mod_bots_webhooks/BotsWebhooksPanel.tsx` | `modules` | 249 | BotsWebhooksPanel |
| `modules/mod_bots_webhooks/botsWebhooksRouter.ts` | `modules` | 311 | createBotsWebhooksRouter |
| `modules/mod_delivery_logs/DeliveryLogsPanel.tsx` | `modules` | 228 | DeliveryLogsPanel |
| `modules/mod_delivery_logs/deliveryLogsRouter.ts` | `modules` | 144 | DeliveryChannelType, DeliveryLogInput, ensureDeliveryLogsSchema, logDeliveryEvent, createDeliveryLogsRouter |
| `modules/mod_ecommerce_suite/ShippingSettingsPanel.tsx` | `modules` | 450 | ShippingSettingsPanel |
| `modules/mod_ecommerce_suite/ecommerceSuiteRouter.ts` | `modules` | 316 | createModEcommerceSuiteRouter |
| `modules/mod_forms/FormsManagerPanel.tsx` | `modules` | 1003 | FormsManagerPanel |
| `modules/mod_forms/GravityFormsEcommerceSuitePanel.tsx` | `modules` | 373 | GravityFormsEcommerceSuitePanel |
| `modules/mod_forms/formsEngineRouter.ts` | `modules` | 245 | createModFormsRouter |
| `modules/mod_i18n/I18nPanel.tsx` | `modules` | 131 | I18nPanel |
| `modules/mod_i18n/i18nRouter.ts` | `modules` | 129 | createI18nRouter |
| `modules/mod_inventory_accounting/InventoryAccountingPanel.tsx` | `modules` | 299 | InventoryAccountingPanel |
| `modules/mod_inventory_accounting/inventoryAccountingRouter.ts` | `modules` | 273 | createModInventoryAccountingRouter |
| `modules/mod_live_chat/AdminGlobalChatAlarm.tsx` | `modules` | 206 | AdminGlobalChatAlarm |
| `modules/mod_live_chat/ChatInlineOtpCard.tsx` | `modules` | 204 | ChatInlineOtpCard |
| `modules/mod_live_chat/GoftinoLiveChatWidget.tsx` | `modules` | 379 | GoftinoLiveChatWidget |
| `modules/mod_live_chat/GoftinoOperatorInboxPanel.tsx` | `modules` | 665 | GoftinoOperatorInboxPanel |
| `modules/mod_live_chat/liveChatRouter.ts` | `modules` | 544 | createModLiveChatRouter |
| `modules/mod_maintenance_audit/MaintenanceAuditPanel.tsx` | `modules` | 154 | MaintenanceAuditPanel |
| `modules/mod_maintenance_audit/maintenanceAuditRouter.ts` | `modules` | 135 | MaintenanceModeConfig, recordAuditTrailEvent, createMaintenanceAuditRouter |
| `modules/mod_notifications_pwa/NotificationsPwaPanel.tsx` | `modules` | 231 | NotificationsPwaPanel |
| `modules/mod_notifications_pwa/PWAInstallBanner.tsx` | `modules` | 164 | PWAInstallBanner |
| `modules/mod_notifications_pwa/notificationsPwaRouter.ts` | `modules` | 231 | createNotificationsPwaRouter |
| `modules/mod_payment_hub/PayzitoPaymentHubPanel.tsx` | `modules` | 333 | PayzitoPaymentHubPanel |
| `modules/mod_payment_hub/paymentHubRouter.ts` | `modules` | 160 | createModPaymentHubRouter |
| `modules/mod_reviews_qa/ProductReviewsQaWidget.tsx` | `modules` | 237 | ProductReviewsQaWidget |
| `modules/mod_reviews_qa/ReviewsQaPanel.tsx` | `modules` | 163 | ReviewsQaPanel |
| `modules/mod_reviews_qa/reviewsQaRouter.ts` | `modules` | 215 | createReviewsQaRouter |
| `modules/mod_seo_redirects/seoRedirectsRouter.ts` | `modules` | 333 | createModSeoRedirectsRouter |
| `modules/mod_smart_crm/SmartCrmAdminPanel.tsx` | `modules` | 303 | SmartCrmAdminPanel |
| `modules/mod_smart_crm/smartCrmRouter.ts` | `modules` | 383 | ensureSmartCrmSchema, runAutoCrmMatchingEngine, createModSmartCrmRouter |
| `modules/mod_subscriptions/SubscriptionsAdminPanel.tsx` | `modules` | 359 | SubscriptionsAdminPanel |
| `modules/mod_subscriptions/subscriptionsRouter.ts` | `modules` | 433 | ensureSubscriptionsSchema, createModSubscriptionsRouter |
| `modules/mod_wallet_rma/WalletRmaPanel.tsx` | `modules` | 201 | WalletRmaPanel |
| `modules/mod_wallet_rma/walletRmaRouter.ts` | `modules` | 178 | createWalletRmaRouter |
| `modules/registry.json` | `modules` | 202 | — |
| `themes/default/theme.json` | `theme` | 21 | — |
| `themes/fatehan/components/CartDrawer.tsx` | `theme` | 242 | CartDrawer |
| `themes/fatehan/components/FatehanStorefrontHome.tsx` | `theme` | 2670 | FatehanStorefrontHome |
| `themes/fatehan/components/StoreOtpLoginModal.tsx` | `theme` | 213 | StoreOtpLoginModal |
| `themes/fatehan/components/StorefrontFooter.tsx` | `theme` | 263 | StorefrontFooter |
| `themes/fatehan/components/StorefrontHeader.tsx` | `theme` | 475 | StorefrontHeader |
| `themes/fatehan/components/VideoLabModal.tsx` | `theme` | 325 | VideoLabModal |
| `themes/fatehan/context/FatehanThemeContext.tsx` | `theme` | 463 | FatehanThemeContextValue, FatehanThemeProviderProps, FatehanThemeProvider, useFatehanTheme |
| `themes/fatehan/context/cmsApiAdapter.ts` | `theme` | 419 | CmsApiAdapterOptions, createCmsV2ApiAdapter |
| `themes/fatehan/index.ts` | `theme` | 76 | FatehanThemeRootProps, FatehanThemeRoot |
| `themes/fatehan/layouts/DesktopLayout.tsx` | `theme` | 30 | DesktopLayout |
| `themes/fatehan/layouts/FatehanThemeShell.tsx` | `theme` | 56 | FatehanThemeShell |
| `themes/fatehan/layouts/MobileLayout.tsx` | `theme` | 117 | MobileLayout |
| `themes/fatehan/layouts/TabletLayout.tsx` | `theme` | 32 | TabletLayout |
| `themes/fatehan/pages/BlogAndAccountRoutes.tsx` | `theme` | 2103 | BlogRoutesPage, CustomerAccountDashboardPage |
| `themes/fatehan/pages/FatehanMultiPages.tsx` | `theme` | 2124 | FatehanCoursesPage, FatehanTuitionCalculatorPage, FatehanSimulatorPage, FatehanContactPage, FatehanFreeCoursesPage, FatehanAboutPage |
| `themes/fatehan/pages/PageRenderer.tsx` | `theme` | 1199 | PageRendererProps, PageRenderer |
| `themes/fatehan/pages/StorefrontRouter.tsx` | `theme` | 2377 | StoreShimmerSkeleton, StorefrontRouter |
| `themes/fatehan/styles/fatehan-theme.css` | `theme` | 370 | — |
| `themes/fatehan/theme.manifest.json` | `theme` | 94 | — |
| `themes/fatehan/types/index.ts` | `theme` | 684 | ViewportMode, PersianFontFamily, PrintPaperSize, DeviceFontSize, DeviceSpacingPreset, BuilderWidgetType |
| `themes/fatehan/ui/BiDiText.tsx` | `theme` | 46 | BiDiTextProps, BiDiText |
| `themes/fatehan/ui/FatehanLogo.tsx` | `theme` | 130 | FatehanLogoProps, FatehanLogo |
| `themes/fatehan/ui/ScrollReveal.tsx` | `theme` | 148 | ScrollRevealProps, ScrollReveal, SmoothScrollProgressBar, useAutoScrollReveal |
| `themes/fatehan/utils/RichFormattedContent.tsx` | `theme` | 89 | RichFormattedContent |
| `themes/fatehan/utils/defaultFallbacks.ts` | `theme` | 328 | DEFAULT_TYPOGRAPHY_CONFIG, DEFAULT_SITE_SETTINGS, DEFAULT_HEADER_MENU, DEFAULT_FOOTER_MENU, DEFAULT_MOBILE_BOTTOM_MENU, DEFAULT_DEPARTMENTS |
| `themes/fatehan/utils/formatters.ts` | `theme` | 50 | formatToman, formatPersianNumber, themeClientCache |
| `themes/registry.ts` | `theme` | 91 | RegisteredThemeId, RegisteredThemeDefinition, THEME_REGISTRY, REGISTERED_THEMES_LIST, resolveRegisteredTheme |
| `public/assets/vendor/barba.umd.js` | `public_assets` | 3 | — |
| `public/assets/vendor/gsap.min.js` | `public_assets` | 12 | — |
| `public/assets/vendor/lenis.min.js` | `public_assets` | 2 | — |
| `public/assets/vendor/muuri.min.js` | `public_assets` | 21 | — |
| `public/assets/vendor/vendor-manifest.json` | `public_assets` | 53 | — |
