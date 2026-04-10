export type Lang = 'zh' | 'en' | 'ja';

// ── Categories ────────────────────────────────────────────────────
export const CATEGORIES: Record<string, Record<Lang, string>> = {
  meat:       { zh: '肉类',   en: 'Meat',       ja: '肉料理' },
  seafood:    { zh: '海鲜',   en: 'Seafood',    ja: '海鮮' },
  vegetables: { zh: '蔬菜',   en: 'Vegetables', ja: '野菜' },
  tofu:       { zh: '豆腐',   en: 'Tofu',       ja: '豆腐' },
  noodles:    { zh: '面食',   en: 'Noodles',    ja: '麺料理' },
  rice:       { zh: '米饭',   en: 'Rice',       ja: 'ご飯' },
  soup:       { zh: '汤品',   en: 'Soup',       ja: 'スープ' },
  eggs:       { zh: '蛋类',   en: 'Eggs',       ja: '卵料理' },
  dessert:    { zh: '甜品',   en: 'Dessert',    ja: 'デザート' },
};

// ── Tags ──────────────────────────────────────────────────────────
export const TAGS: Record<string, Record<Lang, string>> = {
  quick:       { zh: '快手',   en: 'Quick',        ja: '時短' },
  vegetarian:  { zh: '素食',   en: 'Vegetarian',   ja: 'ベジタリアン' },
  spicy:       { zh: '辣',     en: 'Spicy',        ja: '辛口' },
  cantonese:   { zh: '粤菜',   en: 'Cantonese',    ja: '広東料理' },
  sichuan:     { zh: '川菜',   en: 'Sichuan',      ja: '四川料理' },
  japanese:    { zh: '日式',   en: 'Japanese',     ja: '和食' },
  western:     { zh: '西式',   en: 'Western',      ja: '洋食' },
  weeknight:   { zh: '工作日', en: 'Weeknight',    ja: '平日ごはん' },
  entertaining:{ zh: '宴客',   en: 'Entertaining', ja: 'おもてなし' },
  marinate:    { zh: '需腌制', en: 'Marinate',     ja: '漬け込み' },
};

export function getCategoryLabel(key: string, lang: Lang): string {
  return CATEGORIES[key]?.[lang] ?? key;
}

export function getTagLabel(key: string, lang: Lang): string {
  return TAGS[key]?.[lang] ?? key;
}

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
  searchPlaceholder: string;
  allCategories: string;
  noResults: string;
  clearFilters: string;
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
    searchPlaceholder: '搜索菜名…',
    allCategories: '全部',
    noResults: '没有找到匹配的菜品',
    clearFilters: '清除筛选',
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
    searchPlaceholder: 'Search dishes…',
    allCategories: 'All',
    noResults: 'No dishes match your search',
    clearFilters: 'Clear filters',
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
    searchPlaceholder: '料理を検索…',
    allCategories: 'すべて',
    noResults: '一致する料理が見つかりません',
    clearFilters: 'フィルターをクリア',
  },
};

export function getLangName(lang: Lang): string {
  return i18n[lang].langName;
}
