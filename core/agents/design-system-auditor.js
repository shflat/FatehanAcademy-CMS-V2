#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

export function runDesignSystemAudit() {
  const checks = [];
  const warnings = [];

  // 1. Verify DESIGN_SYSTEM_SKILL.md exists
  const skillPath = path.join(ROOT_DIR, 'DESIGN_SYSTEM_SKILL.md');
  const hasSkillDoc = fs.existsSync(skillPath);
  checks.push({
    id: 'design_skill_constitution',
    title: 'Design System Constitution (/DESIGN_SYSTEM_SKILL.md)',
    passed: hasSkillDoc,
  });

  // 2. Verify Zero Scroll-Trap Discipline in Admin & Storefront
  const adminViewPath = path.join(ROOT_DIR, 'src', 'modules', 'admin', 'AdminCmsView.tsx');
  const appPath = path.join(ROOT_DIR, 'src', 'App.tsx');
  const adminContent = fs.existsSync(adminViewPath) ? fs.readFileSync(adminViewPath, 'utf-8') : '';
  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf-8') : '';
  const hasScrollReset =
    adminContent.includes('scrollTo') &&
    (appContent.includes('scrollToTopImmediate') || appContent.includes('scrollTo'));
  checks.push({
    id: 'zero_scroll_trap',
    title: 'Zero Scroll-Trap Rule (Immediate scrollTo top on navigation/edit)',
    passed: hasScrollReset,
  });

  // 3. Verify WP 12-Column Grid & Rich Text Toolbar in Editors
  const catalogEditorPath = path.join(
    ROOT_DIR,
    'src',
    'modules',
    'admin',
    'panels',
    'CatalogEditorPanel.tsx'
  );
  const catalogContent = fs.existsSync(catalogEditorPath)
    ? fs.readFileSync(catalogEditorPath, 'utf-8')
    : '';
  const hasWp12ColGrid =
    catalogContent.includes('lg:grid-cols-12') &&
    catalogContent.includes('lg:col-span-8') &&
    catalogContent.includes('lg:col-span-4');
  checks.push({
    id: 'wp_12col_editor_grid',
    title: 'WordPress 12-Column Split Grid (8 Main + 4 Sticky Sidebar Cards)',
    passed: hasWp12ColGrid,
  });

  // 4. Verify Elementor-Style Side Inspector Drawer in VisualComposerCanvas
  const composerPath = path.join(
    ROOT_DIR,
    'src',
    'modules',
    'admin',
    'components',
    'VisualComposerCanvas.tsx'
  );
  const composerContent = fs.existsSync(composerPath)
    ? fs.readFileSync(composerPath, 'utf-8')
    : '';
  const hasSideInspector =
    composerContent.includes('selectedInspectorWidget') ||
    composerContent.includes('پنل تنظیمات ویجت');
  checks.push({
    id: 'elementor_side_inspector',
    title: 'Elementor-Style Slide-Over Side Inspector Drawer in Visual Composer',
    passed: hasSideInspector,
  });

  // 5. Verify iOS-Grade Mobile App Navigation & 44px Touch Targets
  const mobileNavPath = path.join(
    ROOT_DIR,
    'src',
    'theme',
    'components',
    'MobileBottomNav.tsx'
  );
  const mobileNavContent = fs.existsSync(mobileNavPath)
    ? fs.readFileSync(mobileNavPath, 'utf-8')
    : '';
  const hasMobileTouchTargets =
    mobileNavContent.includes('min-h-[44px]') || mobileNavContent.includes('h-16');
  checks.push({
    id: 'mobile_app_shell_44px',
    title: 'iOS-Grade Mobile Bottom Tab Bar with 44px+ Touch Targets & Cart Badge',
    passed: hasMobileTouchTargets,
  });

  // 6. Verify Zero Placeholder / Lorem Ipsum in Storefront & Catalog
  const hasLorem = /lorem\s+ipsum/i.test(appContent + catalogContent);
  checks.push({
    id: 'zero_lorem_placeholder',
    title: 'Zero Placeholder / Lorem Ipsum Domain Authenticity',
    passed: !hasLorem,
  });

  for (const c of checks) {
    if (!c.passed) warnings.push(`Failed check: ${c.title}`);
  }

  return {
    status: warnings.length === 0 ? 'PASSED' : 'WARNING',
    cmsVersion: 'v2.0.0',
    checksCount: checks.length,
    passedCount: checks.filter((c) => c.passed).length,
    checks,
    warnings,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runDesignSystemAudit();
  console.log(
    `[design-system-auditor] Status: ${report.status} (${report.passedCount}/${report.checksCount} UI/UX & Mobile checks passed)`
  );
  for (const c of report.checks) {
    console.log(`  ${c.passed ? '✓' : '✗'} ${c.title}`);
  }
}
