import express from 'express';
import type { SiteModuleRegistryItem, ThemeConfig } from '../../src/core/types.js';
import { formatIsoToJalali } from '../../src/core/jalali.js';
import { DEFAULT_THEME_CONFIG } from '../../src/data/defaults.js';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../src/server/core/permissionsEngine.js';
import {
  dbExec,
  dbQuery,
  getSetting,
  setSetting,
  writeSystemLog,
} from '../../src/server/database/index.js';
import { DEFAULT_SITE_MODULES_REGISTRY } from '../../src/server/modules/admin/modulesConfigRouter.js';
import {
  INITIAL_ACADEMY_ANNOUNCEMENTS,
  INITIAL_ACADEMY_COURSES,
  INITIAL_ACADEMY_DEPARTMENTS,
  INITIAL_ACADEMY_IDEAS,
  INITIAL_ACADEMY_SETTINGS,
  type AcademyAnnouncementItem,
  type AcademyCourseItem,
  type AcademyDepartmentItem,
  type AcademyIdeaItem,
  type AcademySuiteSettings,
} from './academySeeds.js';

let academySchemaReady = false;

export async function ensureAcademySuiteSchema(): Promise<void> {
  if (academySchemaReady) return;
  const nowIso = new Date().toISOString();

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_academy_departments (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_academy_courses (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      course_kind TEXT NOT NULL DEFAULT 'official',
      age_group TEXT NOT NULL DEFAULT 'A',
      category TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ثبت‌نام فعال',
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_academy_announcements (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL DEFAULT 'public',
      mentioned_phone TEXT,
      is_important INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_academy_ideas (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'جدید',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_academy_consultations (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      student_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      age_group TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    )
  `);

  // Seed departments if empty
  const deptCount = await dbQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM mod_academy_departments');
  if (Number(deptCount[0]?.cnt || 0) === 0) {
    for (let i = 0; i < INITIAL_ACADEMY_DEPARTMENTS.length; i++) {
      const d = INITIAL_ACADEMY_DEPARTMENTS[i];
      await dbExec(
        `INSERT INTO mod_academy_departments (id, sort_order, payload_json, updated_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [d.id, i + 1, JSON.stringify(d), nowIso]
      );
    }
  }

  // Seed courses & free courses if empty
  const courseCount = await dbQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM mod_academy_courses');
  if (Number(courseCount[0]?.cnt || 0) === 0) {
    for (const c of INITIAL_ACADEMY_COURSES) {
      await dbExec(
        `INSERT INTO mod_academy_courses (id, slug, course_kind, age_group, category, status, payload_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.slug,
          c.courseKind || 'official',
          c.ageGroup || 'A',
          c.category || '',
          c.status || 'ثبت‌نام فعال',
          JSON.stringify(c),
          nowIso,
        ]
      );
    }
  }

  // Seed announcements if empty
  const annCount = await dbQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM mod_academy_announcements');
  if (Number(annCount[0]?.cnt || 0) === 0) {
    for (const a of INITIAL_ACADEMY_ANNOUNCEMENTS) {
      await dbExec(
        `INSERT INTO mod_academy_announcements (id, target_type, mentioned_phone, is_important, payload_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
          a.targetType || 'public',
          a.mentionedPhone || null,
          a.isImportant ? 1 : 0,
          JSON.stringify(a),
          nowIso,
        ]
      );
    }
  }

  // Seed ideas if empty
  const ideaCount = await dbQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM mod_academy_ideas');
  if (Number(ideaCount[0]?.cnt || 0) === 0) {
    for (const idea of INITIAL_ACADEMY_IDEAS) {
      await dbExec(
        `INSERT INTO mod_academy_ideas (id, phone, status, payload_json, created_at)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [idea.id, idea.phone || '', idea.status || 'جدید', JSON.stringify(idea), nowIso]
      );
    }
  }

  academySchemaReady = true;
}

async function isAcademySuiteActive(): Promise<boolean> {
  const mods = await getSetting<SiteModuleRegistryItem[]>(
    'site_modules_registry',
    DEFAULT_SITE_MODULES_REGISTRY
  );
  const found = mods.find((m) => m.id === 'mod_academy_suite');
  if (found?.enabled) return true;
  const theme = await getSetting<ThemeConfig>('theme_config', DEFAULT_THEME_CONFIG);
  return theme?.activeThemeId === 'fatehan';
}

function parseJsonRows<T>(rows: Array<{ payload_json: string }>): T[] {
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as T;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as T[];
}

export function createModAcademySuiteRouter(): express.Router {
  const router = express.Router();

  // Unified public bootstrap for Academy module / Fatehan theme
  router.get('/api/v1/modules/academy/bootstrap', async (_req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const active = await isAcademySuiteActive();
      if (!active) {
        res.json({
          ok: true,
          enabled: false,
          departments: [],
          courses: [],
          freeCourses: [],
          announcements: [],
          studentIdeas: [],
          settings: INITIAL_ACADEMY_SETTINGS,
        });
        return;
      }

      const [deptRows, courseRows, annRows, ideaRows, settings] = await Promise.all([
        dbQuery<{ payload_json: string }>(
          'SELECT payload_json FROM mod_academy_departments ORDER BY sort_order ASC, id ASC'
        ),
        dbQuery<{ payload_json: string }>(
          'SELECT payload_json FROM mod_academy_courses ORDER BY course_kind ASC, id ASC'
        ),
        dbQuery<{ payload_json: string }>(
          'SELECT payload_json FROM mod_academy_announcements ORDER BY is_important DESC, created_at DESC'
        ),
        dbQuery<{ payload_json: string }>(
          'SELECT payload_json FROM mod_academy_ideas ORDER BY created_at DESC LIMIT 100'
        ),
        getSetting<AcademySuiteSettings>('mod_academy_settings', INITIAL_ACADEMY_SETTINGS),
      ]);

      const allCourses = parseJsonRows<AcademyCourseItem>(courseRows);
      const courses = allCourses.filter((c) => (c.courseKind || 'official') !== 'free');
      const freeCourses = allCourses
        .filter((c) => c.courseKind === 'free')
        .map((fc) => ({
          id: fc.id,
          slug: fc.slug,
          title: fc.title,
          subtitle: fc.subtitle || fc.summaryFa,
          badge: fc.badge || 'رایگان',
          ageRange: fc.ageRangeFa,
          duration: fc.duration || `${fc.sessionsCount} جلسه`,
          projectsCount: fc.projectsCount || fc.projects?.length || 3,
          projects: fc.projects || fc.syllabusPoints || [],
          description: fc.summaryFa,
          imageUrl: fc.featuredImageUrl,
          ctaText: fc.ctaText || 'ثبت‌نام رایگان در این دوره',
          seoTitle: fc.seoTitle,
          seoDescription: fc.seoDescription,
          focusKeyword: fc.focusKeyword,
        }));

      res.json({
        ok: true,
        enabled: true,
        departments: parseJsonRows<AcademyDepartmentItem>(deptRows),
        courses,
        freeCourses,
        freeCoursesPage: settings.freeCoursesPage || INITIAL_ACADEMY_SETTINGS.freeCoursesPage,
        announcements: parseJsonRows<AcademyAnnouncementItem>(annRows),
        studentIdeas: parseJsonRows<AcademyIdeaItem>(ideaRows),
        settings,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'خطا در دریافت داده‌های ماژول آکادمی',
      });
    }
  });

  // Admin overview (loads all tables even when toggling)
  router.get(
    '/api/v1/modules/academy/admin/overview',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req, res) => {
      try {
        await ensureAcademySuiteSchema();
        const [deptRows, courseRows, annRows, ideaRows, consultRows, settings] = await Promise.all([
          dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_departments ORDER BY sort_order ASC, id ASC'
          ),
          dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_courses ORDER BY course_kind ASC, id ASC'
          ),
          dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_announcements ORDER BY is_important DESC, created_at DESC'
          ),
          dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_ideas ORDER BY created_at DESC'
          ),
          dbQuery<Record<string, unknown>>(
            'SELECT * FROM mod_academy_consultations ORDER BY created_at DESC LIMIT 100'
          ),
          getSetting<AcademySuiteSettings>('mod_academy_settings', INITIAL_ACADEMY_SETTINGS),
        ]);

        res.json({
          ok: true,
          departments: parseJsonRows<AcademyDepartmentItem>(deptRows),
          courses: parseJsonRows<AcademyCourseItem>(courseRows),
          announcements: parseJsonRows<AcademyAnnouncementItem>(annRows),
          ideas: parseJsonRows<AcademyIdeaItem>(ideaRows),
          consultations: consultRows,
          settings: {
            ...INITIAL_ACADEMY_SETTINGS,
            ...(settings || {}),
            tuitionCalculator: {
              ...INITIAL_ACADEMY_SETTINGS.tuitionCalculator,
              ...(settings?.tuitionCalculator || {}),
            },
            freeCoursesPage: {
              ...INITIAL_ACADEMY_SETTINGS.freeCoursesPage,
              ...(settings?.freeCoursesPage || {}),
            },
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در دریافت پنل آکادمی',
        });
      }
    }
  );

  // Departments CRUD
  router.get('/api/v1/modules/academy/departments', async (_req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const rows = await dbQuery<{ payload_json: string }>(
        'SELECT payload_json FROM mod_academy_departments ORDER BY sort_order ASC, id ASC'
      );
      res.json({ ok: true, items: parseJsonRows<AcademyDepartmentItem>(rows) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت دپارتمان‌ها' });
    }
  });

  router.post(
    '/api/v1/modules/academy/departments',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureAcademySuiteSchema();
        const item = req.body as AcademyDepartmentItem;
        if (!item?.id || !item?.title) {
          res.status(400).json({ error: 'شناسه و عنوان دپارتمان الزامی است.' });
          return;
        }
        const sortOrder = Number((req.body as { sortOrder?: number }).sortOrder || 10);
        await dbExec(
          `INSERT INTO mod_academy_departments (id, sort_order, payload_json, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET sort_order = EXCLUDED.sort_order, payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at`,
          [item.id, sortOrder, JSON.stringify(item), new Date().toISOString()]
        );
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ذخیره دپارتمان آکادمی: ${item.title}`,
          detail: `توسط ${req.authSession?.phone || 'admin'}`,
          sqlOrEndpoint: 'POST /api/v1/modules/academy/departments',
        });
        res.json({ ok: true, item });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره دپارتمان' });
      }
    }
  );

  router.delete(
    '/api/v1/modules/academy/departments/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        await dbExec('DELETE FROM mod_academy_departments WHERE id = $1', [String(req.params.id)]);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در حذف دپارتمان' });
      }
    }
  );

  // Courses CRUD (official & free)
  router.get('/api/v1/modules/academy/courses', async (req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const kind = String(req.query.kind || '').trim();
      const rows = kind
        ? await dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_courses WHERE course_kind = $1 ORDER BY id ASC',
            [kind]
          )
        : await dbQuery<{ payload_json: string }>(
            'SELECT payload_json FROM mod_academy_courses ORDER BY course_kind ASC, id ASC'
          );
      res.json({ ok: true, items: parseJsonRows<AcademyCourseItem>(rows) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت دوره‌ها' });
    }
  });

  router.post(
    '/api/v1/modules/academy/courses',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensureAcademySuiteSchema();
        const item = req.body as AcademyCourseItem;
        if (!item?.title) {
          res.status(400).json({ error: 'عنوان دوره الزامی است.' });
          return;
        }
        const id = item.id || `CRS-${Date.now().toString(36).toUpperCase()}`;
        const normalized: AcademyCourseItem = {
          ...item,
          id,
          courseKind: item.courseKind === 'free' ? 'free' : 'official',
          slug: item.slug || id.toLowerCase(),
          code: item.code || id,
          ageGroup: item.ageGroup || 'A',
          status: item.status || 'ثبت‌نام فعال',
        };
        await dbExec(
          `INSERT INTO mod_academy_courses (id, slug, course_kind, age_group, category, status, payload_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             slug = EXCLUDED.slug,
             course_kind = EXCLUDED.course_kind,
             age_group = EXCLUDED.age_group,
             category = EXCLUDED.category,
             status = EXCLUDED.status,
             payload_json = EXCLUDED.payload_json,
             updated_at = EXCLUDED.updated_at`,
          [
            normalized.id,
            normalized.slug,
            normalized.courseKind,
            normalized.ageGroup,
            normalized.category || '',
            normalized.status,
            JSON.stringify(normalized),
            new Date().toISOString(),
          ]
        );
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ذخیره دوره آکادمی: ${normalized.title}`,
          detail: `کد: ${normalized.code} · نوع: ${normalized.courseKind}`,
          sqlOrEndpoint: 'POST /api/v1/modules/academy/courses',
        });
        res.json({ ok: true, item: normalized });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره دوره' });
      }
    }
  );

  router.delete(
    '/api/v1/modules/academy/courses/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        await dbExec('DELETE FROM mod_academy_courses WHERE id = $1', [String(req.params.id)]);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در حذف دوره' });
      }
    }
  );

  // Announcements CRUD
  router.get('/api/v1/modules/academy/announcements', async (_req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const rows = await dbQuery<{ payload_json: string }>(
        'SELECT payload_json FROM mod_academy_announcements ORDER BY is_important DESC, created_at DESC'
      );
      res.json({ ok: true, items: parseJsonRows<AcademyAnnouncementItem>(rows) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت اعلانات' });
    }
  });

  router.post(
    '/api/v1/modules/academy/announcements',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        const body = req.body as Partial<AcademyAnnouncementItem>;
        if (!body?.title || !body?.message) {
          res.status(400).json({ error: 'عنوان و متن اعلان الزامی است.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const item: AcademyAnnouncementItem = {
          id: body.id || `ANN-${Date.now().toString(36).toUpperCase()}`,
          title: body.title.trim(),
          message: body.message.trim(),
          createdAt: body.createdAt || formatIsoToJalali(nowIso),
          badgeText: body.badgeText || (body.targetType === 'user_mention' ? 'پیام اختصاصی' : 'اعلان عمومی'),
          targetType: body.targetType === 'user_mention' ? 'user_mention' : 'public',
          mentionedPhone: body.mentionedPhone?.trim() || undefined,
          mentionedUserName: body.mentionedUserName?.trim() || undefined,
          linkUrl: body.linkUrl?.trim() || undefined,
          isImportant: Boolean(body.isImportant),
        };
        await dbExec(
          `INSERT INTO mod_academy_announcements (id, target_type, mentioned_phone, is_important, payload_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             target_type = EXCLUDED.target_type,
             mentioned_phone = EXCLUDED.mentioned_phone,
             is_important = EXCLUDED.is_important,
             payload_json = EXCLUDED.payload_json`,
          [
            item.id,
            item.targetType,
            item.mentionedPhone || null,
            item.isImportant ? 1 : 0,
            JSON.stringify(item),
            nowIso,
          ]
        );
        res.json({ ok: true, item });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ثبت اعلان' });
      }
    }
  );

  router.delete(
    '/api/v1/modules/academy/announcements/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        await dbExec('DELETE FROM mod_academy_announcements WHERE id = $1', [String(req.params.id)]);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در حذف اعلان' });
      }
    }
  );

  // Student Ideas (Public Create + Admin Moderation)
  router.get('/api/v1/modules/academy/ideas', async (_req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const rows = await dbQuery<{ payload_json: string }>(
        'SELECT payload_json FROM mod_academy_ideas ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ ok: true, items: parseJsonRows<AcademyIdeaItem>(rows) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت ایده‌ها' });
    }
  });

  router.post('/api/v1/modules/academy/ideas', async (req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const body = req.body as Partial<AcademyIdeaItem>;
      if (!body?.title || !body?.note) {
        res.status(400).json({ error: 'عنوان و شرح ایده الزامی است.' });
        return;
      }
      const nowIso = new Date().toISOString();
      const item: AcademyIdeaItem = {
        id: `IDEA-${Date.now().toString(36).toUpperCase()}`,
        title: String(body.title).trim().slice(0, 200),
        note: String(body.note).trim().slice(0, 2000),
        studentName: String(body.studentName || 'کارآموز مهمان').trim().slice(0, 120),
        phone: String(body.phone || '').trim().slice(0, 20),
        ageGroup: body.ageGroup ? String(body.ageGroup).trim().slice(0, 60) : undefined,
        createdAt: formatIsoToJalali(nowIso),
        status: 'جدید',
        adminReply: '',
      };
      await dbExec(
        `INSERT INTO mod_academy_ideas (id, phone, status, payload_json, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [item.id, item.phone, item.status, JSON.stringify(item), nowIso]
      );
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ثبت ایده' });
    }
  });

  router.patch(
    '/api/v1/modules/academy/ideas/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        const id = String(req.params.id);
        const existing = await dbQuery<{ payload_json: string }>(
          'SELECT payload_json FROM mod_academy_ideas WHERE id = $1 LIMIT 1',
          [id]
        );
        if (!existing[0]) {
          res.status(404).json({ error: 'ایده مورد نظر یافت نشد.' });
          return;
        }
        const current = JSON.parse(existing[0].payload_json) as AcademyIdeaItem;
        const nextStatus =
          req.body?.status === 'تایید و تقدیر شده' ||
          req.body?.status === 'بررسی شده' ||
          req.body?.status === 'جدید'
            ? req.body.status
            : current.status;
        const updated: AcademyIdeaItem = {
          ...current,
          status: nextStatus,
          adminReply:
            typeof req.body?.adminReply === 'string' ? req.body.adminReply.trim() : current.adminReply,
        };
        await dbExec(
          'UPDATE mod_academy_ideas SET status = $1, payload_json = $2 WHERE id = $3',
          [updated.status, JSON.stringify(updated), id]
        );
        res.json({ ok: true, item: updated });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در بروزرسانی ایده' });
      }
    }
  );

  router.delete(
    '/api/v1/modules/academy/ideas/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        await dbExec('DELETE FROM mod_academy_ideas WHERE id = $1', [String(req.params.id)]);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در حذف ایده' });
      }
    }
  );

  // Consultations / Free Workshop Leads
  router.post('/api/v1/modules/academy/consultations', async (req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const phone = String(req.body?.phone || '').trim();
      const studentName = String(req.body?.studentName || 'متقاضی مشاوره').trim();
      if (!phone) {
        res.status(400).json({ error: 'شماره تماس الزامی است.' });
        return;
      }
      const id = `CONS-${Date.now().toString(36).toUpperCase()}`;
      const nowIso = new Date().toISOString();
      await dbExec(
        `INSERT INTO mod_academy_consultations (id, phone, student_name, department, age_group, note, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          phone.slice(0, 24),
          studentName.slice(0, 120),
          String(req.body?.department || '').slice(0, 120),
          String(req.body?.ageGroup || '').slice(0, 80),
          String(req.body?.note || '').slice(0, 1000),
          'new',
          nowIso,
        ]
      );
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ثبت درخواست مشاوره' });
    }
  });

  // Settings (Tuition Calculator + Age Roadmaps + Free Courses Page Config)
  router.get('/api/v1/modules/academy/settings', async (_req, res) => {
    try {
      await ensureAcademySuiteSchema();
      const settings = await getSetting<AcademySuiteSettings>(
        'mod_academy_settings',
        INITIAL_ACADEMY_SETTINGS
      );
      res.json({ ok: true, settings });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت تنظیمات آکادمی' });
    }
  });

  router.put(
    '/api/v1/modules/academy/settings',
    requireAuth,
    requirePermission('admin_panel'),
    async (req, res) => {
      try {
        await ensureAcademySuiteSchema();
        const incoming = req.body as Partial<AcademySuiteSettings>;
        const current = await getSetting<AcademySuiteSettings>(
          'mod_academy_settings',
          INITIAL_ACADEMY_SETTINGS
        );
        const merged: AcademySuiteSettings = {
          tuitionCalculator: {
            ...INITIAL_ACADEMY_SETTINGS.tuitionCalculator,
            ...(current?.tuitionCalculator || {}),
            ...(incoming?.tuitionCalculator || {}),
          },
          ageRoadmaps: Array.isArray(incoming?.ageRoadmaps)
            ? incoming.ageRoadmaps
            : current?.ageRoadmaps || INITIAL_ACADEMY_SETTINGS.ageRoadmaps,
          freeCoursesPage: {
            ...INITIAL_ACADEMY_SETTINGS.freeCoursesPage,
            ...(current?.freeCoursesPage || {}),
            ...(incoming?.freeCoursesPage || {}),
          },
        };
        await setSetting('mod_academy_settings', merged);
        res.json({ ok: true, settings: merged });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات آکادمی' });
      }
    }
  );

  return router;
}
