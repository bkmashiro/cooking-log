<script lang="ts">
  // Dish metadata passed from Astro at build time
  export let dishes: {
    name: string;
    slug: string;
    urlSlug: string;
    date: string;
    category?: string;
    tags?: string[];
  }[] = [];

  export let lang: string = 'zh';

  export let t: {
    searchPlaceholder: string;
    allCategories: string;
    noResults: string;
    clearFilters: string;
  };

  export let categories: { key: string; label: string }[] = [];
  export let tags: { key: string; label: string }[] = [];
  export let langLinks: { l: string; label: string }[] = [];

  // ── Filter state ────────────────────────────────────────────────
  let query = '';
  let activeCategory = '';
  let activeTags: Set<string> = new Set();

  function toggleTag(key: string) {
    const next = new Set(activeTags);
    next.has(key) ? next.delete(key) : next.add(key);
    activeTags = next;
  }

  function clearAll() {
    query = '';
    activeCategory = '';
    activeTags = new Set();
  }

  // ── Filtering ────────────────────────────────────────────────────
  $: filtered = dishes.filter(d => {
    const q = query.trim().toLowerCase();
    if (q && !d.name.toLowerCase().includes(q)) return false;
    if (activeCategory && d.category !== activeCategory) return false;
    if (activeTags.size > 0) {
      for (const t of activeTags) {
        if (!d.tags?.includes(t)) return false;
      }
    }
    return true;
  });

  $: hasFilters = query.trim() !== '' || activeCategory !== '' || activeTags.size > 0;

  // ── Available categories from actual data ────────────────────────
  $: availableCats = categories.filter(c =>
    dishes.some(d => d.category === c.key)
  );

  $: availableTags = tags.filter(t =>
    dishes.some(d => d.tags?.includes(t.key))
  );
</script>

<!-- Search bar -->
<div class="sf-search-wrap">
  <input
    class="sf-search"
    type="search"
    placeholder={t.searchPlaceholder}
    bind:value={query}
  />
  {#if hasFilters}
    <button class="sf-clear" on:click={clearAll}>{t.clearFilters} ✕</button>
  {/if}
</div>

<!-- Category pills -->
{#if availableCats.length > 0}
  <div class="sf-pills">
    <button
      class="sf-pill"
      class:sf-pill-active={activeCategory === ''}
      on:click={() => activeCategory = ''}
    >{t.allCategories}</button>
    {#each availableCats as cat}
      <button
        class="sf-pill"
        class:sf-pill-active={activeCategory === cat.key}
        on:click={() => activeCategory = activeCategory === cat.key ? '' : cat.key}
      >{cat.label}</button>
    {/each}
  </div>
{/if}

<!-- Tag chips -->
{#if availableTags.length > 0}
  <div class="sf-tags">
    {#each availableTags as tag}
      <button
        class="sf-tag"
        class:sf-tag-active={activeTags.has(tag.key)}
        on:click={() => toggleTag(tag.key)}
      >{tag.label}</button>
    {/each}
  </div>
{/if}

<!-- Results -->
{#if filtered.length === 0}
  <div class="sf-empty">{t.noResults}</div>
{:else}
  <div class="dish-list">
    {#each filtered as dish}
      <div class="dish-entry">
        <span class="dish-name">
          <a href={`/${lang}/${dish.urlSlug}/`}>{dish.name}</a>
        </span>
        <div class="dish-entry-right">
          {#if dish.tags && dish.tags.length > 0}
            <div class="dish-tag-chips">
              {#each dish.tags.slice(0, 3) as tagKey}
                {@const tagObj = tags.find(t => t.key === tagKey)}
                {#if tagObj}
                  <span class="dish-tag-chip">{tagObj.label}</span>
                {/if}
              {/each}
            </div>
          {/if}
          <div class="dish-lang-links">
            {#each langLinks as { l, label }}
              <a
                href={`/${l}/${dish.urlSlug}/`}
                class={l === lang ? 'active' : ''}
                title={label}
              >{l}</a>
            {/each}
          </div>
          <span class="dish-date">{dish.date}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
.sf-search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.sf-search {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--fg);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}
.sf-search:focus { border-color: var(--accent); }
.sf-clear {
  flex-shrink: 0;
  font-size: 0.78rem;
  color: var(--fg-muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.sf-clear:hover { color: var(--red, #e05c5c); border-color: var(--red, #e05c5c); }

/* Category pills */
.sf-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.sf-pill {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}
.sf-pill:hover { border-color: var(--accent); color: var(--fg); }
.sf-pill-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* Tag chips */
.sf-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}
.sf-tag {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg-muted);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s;
}
.sf-tag:hover { border-color: var(--accent); color: var(--fg); }
.sf-tag-active {
  background: rgba(230,168,23,0.12);
  border-color: var(--accent);
  color: var(--accent);
}

/* Per-dish tag chips in list */
.dish-tag-chips {
  display: flex;
  gap: 4px;
}
.dish-tag-chip {
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(230,168,23,0.1);
  color: var(--accent);
  border: 1px solid rgba(230,168,23,0.25);
}

.sf-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--fg-muted);
  font-size: 0.9rem;
}
</style>
