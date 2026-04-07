import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { Lang } from './i18n';

const DISHES_DIR = path.resolve('/workspace/group/dishes');

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
  base_servings: number;
  ingredients: Ingredient[];
}

export interface Dish {
  slug: string;
  recipe: RecipeYaml;
  prose: Record<Lang, string>;
}

function readProse(dishDir: string, lang: Lang): string {
  const filePath = path.join(dishDir, `${lang}.md`);
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip sentinel HTML comments (keep the content between them)
    // The block looks like <!-- SCALED_TABLE:START ... --> ... <!-- SCALED_TABLE:END -->
    // We want to keep the inner content but remove the comment markers
    content = content.replace(/<!--\s*SCALED_TABLE:START[^>]*-->/g, '');
    content = content.replace(/<!--\s*SCALED_TABLE:END\s*-->/g, '');
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

      const prose: Record<Lang, string> = {
        zh: readProse(dishDir, 'zh'),
        en: readProse(dishDir, 'en'),
        ja: readProse(dishDir, 'ja'),
      };

      dishes.push({
        slug: entry.name,
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
