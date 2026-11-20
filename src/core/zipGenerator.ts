import JSZip from 'jszip';
import type { SkillProduct, ThemeConfig } from './types';
import {
  FULL_TARGET_GUIDE_MARKDOWN,
  STARTER_KIT_FILES,
} from '../data/initialCatalog';

export async function downloadSkill98StarterZip(
  theme: ThemeConfig,
  catalog: SkillProduct[]
): Promise<string> {
  const zip = new JSZip();

  for (const file of STARTER_KIT_FILES) {
    zip.file(file.path, file.getContent(theme));
  }

  zip.file(
    'src/data/skills-catalog.snapshot.json',
    JSON.stringify(
      catalog.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        tool: item.category,
        subCategory: item.subCategory || 'عمومی',
        itemType: item.itemType,
        isFree: item.price === 0,
        priceTomans: item.price,
        version: item.version || item.level,
        shortDescription: item.shortDescription,
        expectedOutput: item.expectedOutput || '',
        status: item.status,
      })),
      null,
      2
    )
  );

  for (const item of catalog) {
    const mdContent =
      item.skillMarkdownContent ||
      `# ${item.title}\n\n- **ابزار سازگار**: ${item.category}\n- **سطح و نسخه**: ${item.level}\n\n## کاربرد\n${item.shortDescription}\n\n## خروجی مورد انتظار\n${item.expectedOutput || 'خروجی ساختاریافته متناسب با نیاز پروژه.'}\n`;
    zip.file(`skills/${item.slug}.md`, mdContent);
  }

  zip.file('TARGET_GUIDE_SKILL98.md', FULL_TARGET_GUIDE_MARKDOWN);

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `skill98-starter-kit.zip`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

export function downloadSingleSkillFile(skill: SkillProduct): string {
  const content = [
    skill.skillMarkdownContent || `# ${skill.title}`,
    '',
    '---',
    `## راهنمای نصب و استفاده در ${skill.category}`,
    ...(skill.usageSteps || [
      '۱. این فایل را در محیط ابزار هوش مصنوعی خود بارگذاری کنید.',
      '۲. هدف یا ورودی پروژه خود را مشخص نمایید.',
      '۳. خروجی استاندارد را تحویل بگیرید.',
    ]).map((s, idx) => `${idx + 1}. ${s}`),
    '',
    `> ارائه‌شده در پلتفرم اسکیل ۹۸ (SKILL 98) — توسعه توسط DPATech (${skill.version || 'v1.0'})`,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const filename = `${skill.slug}.skill98.md`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}
