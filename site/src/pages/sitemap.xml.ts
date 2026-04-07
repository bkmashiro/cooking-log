import { getAllDishes } from '../lib/dishes';

const SITE = 'https://wok.yuzhes.com';
const LANGS = ['zh', 'en', 'ja'] as const;

export async function GET() {
  const dishes = getAllDishes();

  const staticUrls = LANGS.map(lang => ({
    loc: `${SITE}/${lang}/`,
    alternates: LANGS.map(l => ({ lang: l === 'zh' ? 'zh-CN' : l === 'ja' ? 'ja-JP' : 'en-US', href: `${SITE}/${l}/` })),
  }));

  const dishUrls = dishes.flatMap(dish =>
    LANGS.map(lang => ({
      loc: `${SITE}/${lang}/${dish.urlSlug}/`,
      lastmod: dish.recipe.date,
      alternates: LANGS.map(l => ({
        lang: l === 'zh' ? 'zh-CN' : l === 'ja' ? 'ja-JP' : 'en-US',
        href: `${SITE}/${l}/${dish.urlSlug}/`,
      })),
    }))
  );

  const allUrls = [...staticUrls, ...dishUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    ${u.alternates.map(a => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}" />`).join('\n    ')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/zh/" />
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
