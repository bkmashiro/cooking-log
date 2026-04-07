export type Lang = 'zh' | 'en' | 'ja';

export const LANGS: Lang[] = ['zh', 'en', 'ja'];

export const i18n: Record<Lang, {
  siteTitle: string;
  tagline: string;
  allDishes: string;
  date: string;
  servings: string;
  ingredients: string;
  backToList: string;
  langName: string;
}> = {
  zh: {
    siteTitle: '神圣烹饪典籍',
    tagline: '这不是美食博客，这是基础设施。',
    allDishes: '所有菜品',
    date: '日期',
    servings: '份量',
    ingredients: '食材',
    backToList: '← 返回菜品列表',
    langName: '中文',
  },
  en: {
    siteTitle: 'Sacred Cooking Codex',
    tagline: 'This is not a recipe blog. This is infrastructure.',
    allDishes: 'All Dishes',
    date: 'Date',
    servings: 'Servings',
    ingredients: 'Ingredients',
    backToList: '← Back to dish list',
    langName: 'English',
  },
  ja: {
    siteTitle: '神聖なる料理典籍',
    tagline: 'これはレシピブログではない。これはインフラだ。',
    allDishes: 'すべての料理',
    date: '日付',
    servings: '人数分',
    ingredients: '食材',
    backToList: '← 料理一覧に戻る',
    langName: '日本語',
  },
};

export function getLangName(lang: Lang): string {
  return i18n[lang].langName;
}
