import express from 'express';
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
import type { SeoCrawlVisibilityConfig, ThemeConfig } from '../../src/core/types.js';
import { DEFAULT_THEME_CONFIG } from '../../src/data/defaults.js';

const DEFAULT_SEO_VISIBILITY: SeoCrawlVisibilityConfig = {
  allowSearchEngines: false, // Default OFF until admin explicitly opens site to search engines
  allowAiCrawlers: false, // Separate opt-in for AI/LLM crawlers & llms.txt
  customRobotsExtra: '',
  customLlmsIntro: '',
};

export function createModSeoRedirectsRouter(): express.Router {
  const router = express.Router();

  // Public endpoint so SPA <head> keeps <meta name="robots"> in sync live
  router.get('/api/v1/seo/visibility', async (_req, res) => {
    try {
      const cfg = await getSetting<SeoCrawlVisibilityConfig>(
        'seo_crawl_visibility',
        DEFAULT_SEO_VISIBILITY
      );
      res.json({
        ok: true,
        visibility: {
          ...DEFAULT_SEO_VISIBILITY,
          ...cfg,
        },
      });
    } catch {
      res.json({ ok: true, visibility: DEFAULT_SEO_VISIBILITY });
    }
  });

  // Admin: Save SEO & AI Crawler Visibility Settings
  router.put(
    '/api/v1/modules/seo-redirects/visibility',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const nextCfg: SeoCrawlVisibilityConfig = {
          allowSearchEngines: Boolean(b.allowSearchEngines),
          allowAiCrawlers: Boolean(b.allowAiCrawlers),
          customRobotsExtra: String(b.customRobotsExtra || '').trim(),
          customLlmsIntro: String(b.customLlmsIntro || '').trim(),
        };
        await setSetting('seo_crawl_visibility', nextCfg);
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: 'به‌روزرسانی دسترسی ربات‌های جستجو و هوش مصنوعی',
          detail: `موتورهای جستجو: ${nextCfg.allowSearchEngines ? 'فعال (index)' : 'غیرفعال (noindex)'} | هوش مصنوعی (llms.txt): ${nextCfg.allowAiCrawlers ? 'فعال' : 'غیرفعال'}`,
          sqlOrEndpoint: 'PUT /api/v1/modules/seo-redirects/visibility',
        });
        res.json({ ok: true, visibility: nextCfg });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات دیده‌شدن سایت',
        });
      }
    }
  );

  // Dynamic XML Sitemap Generator (/sitemap.xml)
  router.get('/sitemap.xml', async (req, res) => {
    try {
      const vis = await getSetting<SeoCrawlVisibilityConfig>(
        'seo_crawl_visibility',
        DEFAULT_SEO_VISIBILITY
      );
      if (!vis.allowSearchEngines) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.send(
          '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Search engine indexing is currently disabled in CMS SEO settings -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
        );
        return;
      }

      const origin = `${req.protocol}://${req.get('host') || 'skill98.ir'}`;
      const products = await dbQuery<{ slug: string; updated_at: string }>(
        "SELECT slug, updated_at FROM products WHERE status = 'published' LIMIT 1000"
      );
      const articles = await dbQuery<{ slug: string; updated_at: string }>(
        "SELECT slug, updated_at FROM articles WHERE status = 'published' LIMIT 500"
      );
      const pages = await dbQuery<{ slug: string; updated_at: string }>(
        "SELECT slug, updated_at FROM pages WHERE status = 'published' LIMIT 200"
      );

      const urlEntries: string[] = [
        `<url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${origin}/store</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
        `<url><loc>${origin}/articles</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
      ];
      for (const p of pages) {
        urlEntries.push(
          `<url><loc>${origin}/page/${encodeURIComponent(p.slug)}</loc><lastmod>${(p.updated_at || '').slice(0, 10)}</lastmod><priority>0.8</priority></url>`
        );
      }
      for (const prod of products) {
        urlEntries.push(
          `<url><loc>${origin}/product/${encodeURIComponent(prod.slug)}</loc><lastmod>${(prod.updated_at || '').slice(0, 10)}</lastmod><priority>0.9</priority></url>`
        );
      }
      for (const art of articles) {
        urlEntries.push(
          `<url><loc>${origin}/article/${encodeURIComponent(art.slug)}</loc><lastmod>${(art.updated_at || '').slice(0, 10)}</lastmod><priority>0.7</priority></url>`
        );
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>`;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(xml);
    } catch {
      res.status(500).send('<!-- Sitemap Error -->');
    }
  });

  // Dynamic robots.txt Generator (/robots.txt)
  router.get('/robots.txt', async (req, res) => {
    const origin = `${req.protocol}://${req.get('host') || 'skill98.ir'}`;
    const vis = await getSetting<SeoCrawlVisibilityConfig>(
      'seo_crawl_visibility',
      DEFAULT_SEO_VISIBILITY
    );
    const aiBots = [
      'GPTBot',
      'ChatGPT-User',
      'OAI-SearchBot',
      'ClaudeBot',
      'Claude-Web',
      'anthropic-ai',
      'PerplexityBot',
      'Google-Extended',
      'CCBot',
    ];

    const lines: string[] = [];
    if (!vis.allowSearchEngines) {
      lines.push('# Search Engine Indexing is DISABLED in CMS SEO Settings');
      lines.push('User-agent: *');
      lines.push('Disallow: /');
    } else {
      lines.push('# Search Engine Indexing is ENABLED');
      lines.push('User-agent: *');
      lines.push('Allow: /');
      lines.push('Disallow: /api/admin/');
      lines.push(`Sitemap: ${origin}/sitemap.xml`);
    }

    lines.push('');
    lines.push(
      vis.allowAiCrawlers
        ? `# AI / LLM Crawlers ENABLED — Directory: ${origin}/llms.txt`
        : '# AI / LLM Crawlers DISABLED in CMS SEO Settings'
    );
    for (const bot of aiBots) {
      lines.push(`User-agent: ${bot}`);
      lines.push(vis.allowAiCrawlers ? 'Allow: /' : 'Disallow: /');
    }

    if (vis.customRobotsExtra?.trim()) {
      lines.push('');
      lines.push(vis.customRobotsExtra.trim());
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n'));
  });

  // Dynamic llms.txt & llm.txt Standard Generator for AI Models (ChatGPT, Claude, Perplexity, Gemini)
  const serveLlmsTxt: express.RequestHandler = async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get('host') || 'skill98.ir'}`;
      const vis = await getSetting<SeoCrawlVisibilityConfig>(
        'seo_crawl_visibility',
        DEFAULT_SEO_VISIBILITY
      );
      const theme = await getSetting<ThemeConfig>('theme_config', DEFAULT_THEME_CONFIG);
      if (!vis.allowAiCrawlers) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.send(
          [
            `# ${theme.brandNameFa || 'Fatehan Robotics Academy'} (${theme.brandNameEn || 'Fatehan Academy'})`,
            '',
            '> Automated AI / LLM indexing is currently restricted by the site administrator.',
            '',
            '## Site Policy',
            `- [Official Website](${origin}/): Public storefront and robotics academy portal.`,
            `- [Contact & Consultation](${origin}/contact): Direct contact details and academy address.`,
          ].join('\n')
        );
        return;
      }

      const products = await dbQuery<{ slug: string; title: string; category: string }>(
        "SELECT slug, title, category FROM products WHERE status = 'published' ORDER BY updated_at DESC LIMIT 80"
      );
      const articles = await dbQuery<{ slug: string; title: string; category: string }>(
        "SELECT slug, title, category FROM articles WHERE status = 'published' ORDER BY updated_at DESC LIMIT 50"
      );
      const pages = await dbQuery<{ slug: string; title: string }>(
        "SELECT slug, title FROM pages WHERE status = 'published' ORDER BY updated_at DESC LIMIT 30"
      );

      const lines: string[] = [
        `# ${theme.brandNameFa} (${theme.brandNameEn})`,
        '',
        `> ${vis.customLlmsIntro?.trim() || theme.footerDescription || theme.heroSubtitle}`,
        '',
        '## Core Sections',
        `- [Homepage](${origin}/): Main landing page and overview`,
        `- [Robotics Courses](${origin}/courses): Official project-based robotics, coding, AI, and 3D printing courses`,
        `- [Kits & Store](${origin}/shop): Robotics kits, electronics components, and educational packages`,
        `- [Editorial Magazine](${origin}/blog): Engineering articles and student guides`,
        `- [Sitemap](${origin}/sitemap.xml): XML sitemap`,
        '',
        '## Published Kits & Packages',
        ...products.map(
          (p) => `- [${p.title}](${origin}/product/${encodeURIComponent(p.slug)}): Category ${p.category}`
        ),
        '',
        '## Engineering Articles & Guides',
        ...articles.map(
          (a) => `- [${a.title}](${origin}/article/${encodeURIComponent(a.slug)}): Topic ${a.category}`
        ),
        '',
        '## Site Pages',
        ...pages.map((pg) => `- [${pg.title}](${origin}/page/${encodeURIComponent(pg.slug)})`),
      ];

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(lines.join('\n'));
    } catch {
      res.status(500).send('# Error generating llms.txt');
    }
  };

  router.get('/llms.txt', serveLlmsTxt);
  router.get('/llm.txt', serveLlmsTxt);

  // List all 301/302 Redirects & 404 Captures
  router.get(
    '/api/v1/modules/seo-redirects/rules',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        const rules = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_seo_redirects ORDER BY hits_count DESC, updated_at DESC'
        );
        res.json({ ok: true, rules });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در بازیابی قوانین ریدایرکت' });
      }
    }
  );

  // Create or Update 301/302 Redirect Rule
  router.post(
    '/api/v1/modules/seo-redirects/rules',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const fromPath = String(b.fromPath || '').trim();
        const toPath = String(b.toPath || '/').trim();
        const redirectCode = Number(b.redirectCode) === 302 ? 302 : 301;
        const noteFa = String(b.noteFa || '').trim();
        if (!fromPath.startsWith('/')) {
          res.status(400).json({ error: 'مسیر مبدا باید با / آغاز شود.' });
          return;
        }
        const nowIso = new Date().toISOString();
        const id = String(b.id || `redir_${Date.now()}`);

        await dbExec(
          `INSERT INTO mod_seo_redirects (id, from_path, to_path, redirect_code, hits_count, is_404_captured, note_fa, enabled, updated_at)
           VALUES ($1,$2,$3,$4,0,0,$5,1,$6)
           ON CONFLICT (from_path) DO UPDATE SET
             to_path = EXCLUDED.to_path,
             redirect_code = EXCLUDED.redirect_code,
             note_fa = EXCLUDED.note_fa,
             enabled = 1,
             updated_at = EXCLUDED.updated_at`,
          [id, fromPath, toPath, redirectCode, noteFa, nowIso]
        );

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ثبت قانون ریدایرکت ${redirectCode}: ${fromPath} -> ${toPath}`,
          detail: noteFa || 'مرکز ریدایرکت سئو',
          sqlOrEndpoint: 'POST /api/v1/modules/seo-redirects/rules',
        });

        const rules = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_seo_redirects ORDER BY hits_count DESC, updated_at DESC'
        );
        res.json({ ok: true, rules });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ذخیره ریدایرکت' });
      }
    }
  );

  // Delete Redirect Rule
  router.delete(
    '/api/v1/modules/seo-redirects/rules/:id',
    requireAuth,
    requirePermission('admin_panel'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await dbExec('DELETE FROM mod_seo_redirects WHERE id = $1', [String(req.params.id)]);
        const rules = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_seo_redirects ORDER BY hits_count DESC, updated_at DESC'
        );
        res.json({ ok: true, rules });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در حذف ریدایرکت' });
      }
    }
  );

  return router;
}
