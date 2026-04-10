import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { Lang } from './i18n';

// Relative to the site/ directory: site/../dishes = repo root /dishes/
const DISHES_DIR = path.resolve(new URL('../../..', import.meta.url).pathname, 'dishes');

export interface MultiLang {
  zh: string;
  en: string;
  ja: string;
}

export interface Ingredient {
  name: MultiLang;
  amount?: number;
  unit?: string | MultiLang;
  scale?: 'linear' | 'discrete' | 'to_taste';
  note?: MultiLang;
}

export interface RecipeYaml {
  dish: MultiLang;
  date: string;
  url_slug?: string;
  base_servings: number;
  ingredients: Ingredient[];
  category?: string;   // canonical key, e.g. "vegetables"
  tags?: string[];     // canonical keys, e.g. ["quick", "vegetarian"]
}

export interface Dish {
  slug: string;      // directory name (internal identifier)
  urlSlug: string;   // ASCII URL-safe slug for routes
  recipe: RecipeYaml;
  prose: Record<Lang, string>;
}

function readProse(dishDir: string, lang: Lang): string {
  const filePath = path.join(dishDir, `${lang}.md`);
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip the entire SCALED_TABLE block (sentinel comments + all content between them)
    // The interactive scaler in the page replaces this static table
    content = content.replace(/<!--\s*SCALED_TABLE:START[\s\S]*?SCALED_TABLE:END\s*-->/g, '');
    return content;
  } catch {
    return '';
  }
}

export function getAllDishes(): Dish[] {
  if (!fs.existsSync(DISHES_DIR)) return [];

  const entries = fs.readdirSync(DISHES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first

  const dishes: Dish[] = [];

  for (const entry of entries) {
    const dishDir = path.join(DISHES_DIR, entry.name);
    const recipeFile = path.join(dishDir, 'recipe.yaml');
    if (!fs.existsSync(recipeFile)) continue;

    try {
      const raw = fs.readFileSync(recipeFile, 'utf-8');
      const recipe = yaml.load(raw) as RecipeYaml;

      // js-yaml parses bare YAML dates as JS Date objects — normalise to YYYY-MM-DD string
      if (recipe.date instanceof Date) {
        recipe.date = recipe.date.toISOString().slice(0, 10);
      }

      const prose: Record<Lang, string> = {
        zh: readProse(dishDir, 'zh'),
        en: readProse(dishDir, 'en'),
        ja: readProse(dishDir, 'ja'),
      };

      // Use explicit url_slug if set, otherwise fall back to directory name
      // (directory names with non-ASCII chars get percent-encoded in URLs)
      const urlSlug = recipe.url_slug || entry.name;

      dishes.push({
        slug: entry.name,
        urlSlug,
        recipe,
        prose,
      });
    } catch (e) {
      console.warn(`Failed to load dish ${entry.name}:`, e);
    }
  }

  return dishes;
}

export function getDishBySlug(slug: string): Dish | undefined {
  return getAllDishes().find(d => d.slug === slug);
}

export function getDishName(dish: Dish, lang: Lang): string {
  return dish.recipe.dish[lang] || dish.recipe.dish.zh;
}
