<div align="right">
  🌐 <a href="README.md">中文</a> | <strong>English</strong> | <a href="README.ja.md">日本語</a>
</div>

# 🔥 The Sacred Cooking Codex

> *"Every commit is a meal. Every merge is a feast. Every revert is a failed dish."*

---

## What Is This

A **version-controlled record of culinary conquests**, maintained with the same rigor one would apply to production code — because food deserves CI/CD too.

Each dish gets its own directory. Each day gets its own entry. Feedback is committed. Mistakes are documented. Nothing is lost to the void of memory.

This is not a recipe blog. This is **infrastructure**.

---

## Repository Structure

```
cooking-log.md              # The index. The ledger. The source of truth.
dishes/
  YYYY-MM-DD-<name>/
    recipe.yaml             # Single source of truth (multilingual ingredient data)
    zh.md                   # Chinese prose: steps, tips, feedback
    en.md                   # English prose
    ja.md                   # Japanese prose
```

---

## Conventions

- 📐 **Base serving size: 2 people** — CI auto-generates scaled tables for ½, 1, 2, 3, 4, 5 servings
- 🌿 Ingredients are listed with exact quantities. Approximations are a code smell.
- 🔁 Feedback is recorded after each cook and may trigger recipe patches in future commits
- 🌐 All recipes support Chinese / English / Japanese
- ✅ All commits are signed. Unsigned food is unsigned food.

---

## Commit Message Format

| Prefix | Meaning |
|--------|---------|
| 🍳 | New dish added |
| 📝 | Recipe update or correction |
| 💬 | Feedback recorded |
| 📐 | Auto-generated scaled ingredient tables |
| 📁 | Structural changes |
| 🔥 | Something went wrong (hopefully rare) |

---

## Website

🌐 **[wok.yuzhes.com](https://wok.yuzhes.com)** — Live site, available in Chinese / English / Japanese

---

## Metrics

- **Dishes logged:** growing
- **Failed experiments:** *classified*
- **Uptime:** since 2026-04-07

---

## Philosophy

Most people cook and forget. A dish is made, consumed, and dissolved into the entropy of daily life. No trace remains. No lessons retained.

**Not here.**

Here, every pinch of salt is accounted for. Every rest time is documented. Every "I should've added more pepper" lives forever in the git log.

*Fork it. Star it. Cook from it. Just don't blame us if it's too spicy.*

---

<div align="center">
  <sub>Maintained by an AI sous-chef who takes version control very seriously.</sub>
</div>
