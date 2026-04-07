#!/usr/bin/env python3
"""
scale_ingredients.py — Auto-generates scaled ingredient tables from recipe.yaml.

Directory structure:
  dishes/
    <slug>/
      recipe.yaml   ← single source of truth (multilingual)
      zh.md         ← Chinese prose
      en.md         ← English prose
      ja.md         ← Japanese prose

Usage:
  python3 scale_ingredients.py --all            # process all dishes/
  python3 scale_ingredients.py dishes/slug/     # process one dish
  python3 scale_ingredients.py --dry-run --all  # check without writing

Scale types:
  linear    — scales proportionally (default)
  discrete  — snaps to nearest ½, minimum ½ (whole veg, cloves, eggs)
  to_taste  — renders as locale-specific "to taste" string
  fixed     — renders unchanged regardless of multiplier
"""

import re
import sys
import yaml
from pathlib import Path
from datetime import date

# ---------------------------------------------------------------------------
# Scale targets — base is 2 servings
# ---------------------------------------------------------------------------
SCALES = [
    (0.25, "¼x",  {"zh": "½人份",  "en": "½ serving",  "ja": "½人前"}),
    (0.5,  "½x",  {"zh": "1人份",  "en": "1 serving",  "ja": "1人前"}),
    (1.0,  "1x",  {"zh": "2人份✦", "en": "2 servings✦","ja": "2人前✦"}),
    (1.5,  "1½x", {"zh": "3人份",  "en": "3 servings",  "ja": "3人前"}),
    (2.0,  "2x",  {"zh": "4人份",  "en": "4 servings",  "ja": "4人前"}),
    (2.5,  "2½x", {"zh": "5人份",  "en": "5 servings",  "ja": "5人前"}),
]
BASE_IDX = 2

TO_TASTE = {"zh": "适量", "en": "to taste", "ja": "適量"}

FRACTIONS = {
    0.25: "¼",  0.5: "½",  0.75: "¾",
    1.25: "1¼", 1.5: "1½", 1.75: "1¾",
    2.25: "2¼", 2.5: "2½", 2.75: "2¾",
    3.25: "3¼", 3.5: "3½", 3.75: "3¾",
    4.5:  "4½", 5.5: "5½",
}

SENTINEL_START = "<!-- SCALED_TABLE:START — do not edit this block manually -->"
SENTINEL_END   = "<!-- SCALED_TABLE:END -->"


# ---------------------------------------------------------------------------
# Localisation helpers
# ---------------------------------------------------------------------------

def loc(value, locale: str) -> str:
    """Resolve a string-or-dict value to the given locale."""
    if isinstance(value, dict):
        return str(value.get(locale) or value.get("zh") or next(iter(value.values())))
    return str(value) if value is not None else ""


# ---------------------------------------------------------------------------
# Number formatting
# ---------------------------------------------------------------------------

def float_to_display(v: float) -> str:
    if v <= 0:
        return "—"
    for fval, fstr in FRACTIONS.items():
        if abs(v - fval) < 0.015:
            return fstr
    if abs(v - round(v)) < 0.015:
        return str(int(round(v)))
    if v >= 10:
        return str(int(round(v)))
    return f"{v:.1f}".rstrip("0").rstrip(".")


def format_amount(ing: dict, multiplier: float, locale: str) -> str:
    scale_type = ing.get("scale", "linear")
    unit = loc(ing.get("unit", ""), locale)

    if scale_type == "to_taste":
        return TO_TASTE[locale]
    if scale_type == "fixed":
        return f"{ing['amount']}{unit}"

    raw = ing["amount"] * multiplier

    if scale_type == "discrete":
        snapped = max(0.5, round(raw * 2) / 2)
        if snapped == int(snapped):
            return f"{int(snapped)}{unit}"
        whole = int(snapped)
        return f"½{unit}" if whole == 0 else f"{whole}½{unit}"

    return f"{float_to_display(raw)}{unit}"


# ---------------------------------------------------------------------------
# Table generation
# ---------------------------------------------------------------------------

def build_table(ingredients: list, base_servings: int, locale: str) -> str:
    today = date.today().isoformat()

    base_label = {"zh": f"基础份量：{base_servings}人份",
                  "en": f"base: {base_servings} servings",
                  "ja": f"基準：{base_servings}人前"}[locale]
    note_label = {
        "zh": "`discrete` 食材已取整至½步进；`适量` 食材不参与换算。",
        "en": "`discrete` items snapped to nearest ½; `to taste` items not scaled.",
        "ja": "`discrete` 食材は½単位に丸め；`適量` 食材はスケールしません。",
    }[locale]
    name_header = {"zh": "食材", "en": "Ingredient", "ja": "食材"}[locale]

    header_cells = [name_header] + [
        f"{label}<br/>({loc(servings, locale)})"
        for _, label, servings in SCALES
    ]
    header_row = "| " + " | ".join(header_cells) + " |"
    sep_row    = "|" + "|".join([":---"] + ["---:"] * len(SCALES)) + "|"

    rows = [header_row, sep_row]
    for ing in ingredients:
        name = loc(ing["name"], locale)
        note = loc(ing.get("note", ""), locale)
        name_cell = f"**{name}**" if not note else f"**{name}** *({note})*"
        cells = [name_cell]
        for i, (mult, _, _) in enumerate(SCALES):
            val = format_amount(ing, mult, locale)
            cells.append(f"**{val}**" if i == BASE_IDX else val)
        rows.append("| " + " | ".join(cells) + " |")

    table_md = "\n".join(rows)
    return f"""{SENTINEL_START}
<!-- Generated by scale_ingredients.py · {today} -->

## {"📐 份量换算" if locale == "zh" else ("📐 Serving Sizes" if locale == "en" else "📐 份量換算")}

> 🤖 {"自动生成" if locale == "zh" else ("Auto-generated" if locale == "en" else "自動生成")} · {base_label} · ✦ = {"原始食谱" if locale == "zh" else ("original recipe" if locale == "en" else "元のレシピ")}
> {note_label}

{table_md}

{SENTINEL_END}"""


# ---------------------------------------------------------------------------
# File injection
# ---------------------------------------------------------------------------

def inject_table(text: str, block: str) -> str:
    pattern = re.compile(
        re.escape(SENTINEL_START) + r".*?" + re.escape(SENTINEL_END),
        re.DOTALL,
    )
    if pattern.search(text):
        return pattern.sub(block, text)
    # Insert before first ## heading
    first_h2 = re.search(r"^## ", text, re.MULTILINE)
    if first_h2:
        return text[:first_h2.start()] + block + "\n\n" + text[first_h2.start():]
    return text.rstrip() + "\n\n" + block + "\n"


# ---------------------------------------------------------------------------
# Recipe processing
# ---------------------------------------------------------------------------

LOCALE_FROM_FILENAME = {"zh": "zh", "en": "en", "ja": "ja"}

def process_recipe_dir(recipe_yaml: Path, dry_run: bool = False) -> bool:
    data = yaml.safe_load(recipe_yaml.read_text(encoding="utf-8"))
    ingredients = data.get("ingredients")
    if not ingredients:
        print(f"  ⏭️  No ingredients in {recipe_yaml}, skipping")
        return False

    base_servings = data.get("base_servings", 2)
    changed = False

    for locale_file in sorted(recipe_yaml.parent.glob("*.md")):
        stem = locale_file.stem  # zh / en / ja
        locale = LOCALE_FROM_FILENAME.get(stem)
        if not locale:
            print(f"  ⏭️  Unknown locale '{stem}' — skipping {locale_file.name}")
            continue

        text = locale_file.read_text(encoding="utf-8")
        block = build_table(ingredients, base_servings, locale)
        new_text = inject_table(text, block)

        if new_text == text:
            print(f"  ✅ Up-to-date:  {locale_file.parent.name}/{locale_file.name}")
            continue

        if dry_run:
            print(f"  📝 Would update: {locale_file.parent.name}/{locale_file.name}")
            changed = True
            continue

        locale_file.write_text(new_text, encoding="utf-8")
        print(f"  ✅ Updated:     {locale_file.parent.name}/{locale_file.name}")
        changed = True

    return changed


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    dry_run  = "--dry-run" in args
    all_mode = "--all"     in args
    paths_raw = [a for a in args if not a.startswith("--")]

    if all_mode:
        recipe_yamls = sorted(Path("dishes").glob("*/recipe.yaml"))
    elif paths_raw:
        recipe_yamls = []
        for p in paths_raw:
            candidate = Path(p)
            if candidate.name == "recipe.yaml":
                recipe_yamls.append(candidate)
            elif candidate.is_dir():
                recipe_yamls.append(candidate / "recipe.yaml")
            else:
                # Legacy: single .md file passed — skip gracefully
                print(f"  ⏭️  Skipping legacy path: {p}")
        recipe_yamls = [r for r in recipe_yamls if r.exists()]
    else:
        print("Usage: scale_ingredients.py [--dry-run] [--all] [dishes/slug/ ...]")
        sys.exit(1)

    if not recipe_yamls:
        print("No recipe.yaml files found.")
        sys.exit(0)

    print(f"🧮 Processing {len(recipe_yamls)} recipe(s){'  [dry-run]' if dry_run else ''}...")
    any_changed = any(process_recipe_dir(r, dry_run) for r in recipe_yamls)

    if dry_run and any_changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
