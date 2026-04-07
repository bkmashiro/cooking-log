<script lang="ts">
  import { servingsStore } from '../stores/scaler';

  // ── Props ────────────────────────────────────────────────────────
  export let ingredients: {
    name: string; amount: number | null; unit: string;
    scale: string; note: string;
  }[] = [];
  export let baseServings: number = 2;
  export let i18n: {
    label: string; unit: string; ingredient: string; amount: string;
    toTaste: string;
    easter: [number | 'nan' | 'inf', string][];
  };

  // ── State ────────────────────────────────────────────────────────
  let servings = baseServings;
  $: servingsStore.set(servings);  // keep store in sync

  // ── Fraction display ─────────────────────────────────────────────
  const FRACTIONS: Record<number, string> = {
    0.25:'¼', 0.5:'½', 0.75:'¾',
    1.25:'1¼', 1.5:'1½', 1.75:'1¾',
    2.25:'2¼', 2.5:'2½', 2.75:'2¾',
    3.25:'3¼', 3.5:'3½', 3.75:'3¾',
    4.5:'4½', 5.5:'5½',
  };

  function fmt(v: number): string {
    if (v <= 0) return '0';
    for (const [fv, fs] of Object.entries(FRACTIONS))
      if (Math.abs(v - +fv) < 0.015) return fs;
    if (Math.abs(v - Math.round(v)) < 0.015) return String(Math.round(v));
    if (v >= 10) return String(Math.round(v));
    return v.toFixed(1).replace(/\.0$/, '');
  }

  export function scaleAmt(ing: typeof ingredients[0], mult: number): string {
    if (ing.scale === 'to_taste') return i18n.toTaste;
    if (ing.scale === 'fixed' || ing.amount == null)
      return ing.amount != null ? `${ing.amount}${ing.unit}` : i18n.toTaste;
    const raw = ing.amount * mult;
    if (ing.scale === 'discrete') {
      const snapped = Math.max(0.5, Math.round(raw * 2) / 2);
      if (snapped === Math.floor(snapped)) return `${Math.floor(snapped)}${ing.unit}`;
      const w = Math.floor(snapped);
      return w === 0 ? `½${ing.unit}` : `${w}½${ing.unit}`;
    }
    return `${fmt(raw)}${ing.unit}`;
  }

  // ── Easter egg ───────────────────────────────────────────────────
  function getEaster(v: number, isNaN_: boolean, isInf: boolean): string | null {
    for (const [trigger, msg] of i18n.easter) {
      if (trigger === 'nan' && isNaN_) return msg;
      if (trigger === 'inf' && isInf) return msg;
      if (typeof trigger === 'number') {
        if (trigger < 0 && v < 0) return msg;
        if (trigger === 0 && v === 0) return msg;
        if (trigger > 0 && trigger < 0.1 && v > 0 && v < 0.1) return msg;
        if (trigger >= 999 && v >= 999) return msg;
      }
    }
    return null;
  }

  // ── Derived state ────────────────────────────────────────────────
  $: isNaN_  = isNaN(servings);
  $: isInf   = !isNaN_ && !isFinite(servings);
  $: invalid = isNaN_ || isInf;
  $: easter  = getEaster(servings, isNaN_, isInf);
  $: mult    = baseServings > 0 ? servings / baseServings : 0;

  // ── Controls ─────────────────────────────────────────────────────
  function dec() {
    servings = Math.max(0, Math.round((servings - 0.5) * 10) / 10);
  }
  function inc() {
    servings = Math.round((servings + 0.5) * 10) / 10;
  }
  function onInput(e: Event) {
    servings = parseFloat((e.target as HTMLInputElement).value);
  }
</script>

<div class="scaler-section">
  <div class="scaler-control">
    <span class="scaler-label">{i18n.label}</span>
    <button class="scaler-btn" on:click={dec}>−</button>
    <input
      class="scaler-input"
      type="number"
      min="0"
      step="0.5"
      value={servings}
      on:input={onInput}
    />
    {#if i18n.unit}<span class="scaler-unit">{i18n.unit}</span>{/if}
    <button class="scaler-btn" on:click={inc}>＋</button>
  </div>

  {#if easter}
    <div class="scaler-easter">{easter}</div>
  {/if}

  {#if !invalid}
    <table class="ingredient-table">
      <thead>
        <tr>
          <th>{i18n.ingredient}</th>
          <th>{i18n.amount}</th>
        </tr>
      </thead>
      <tbody>
        {#each ingredients as ing}
          <tr>
            <td>
              <strong>{ing.name}</strong>
              {#if ing.note}<em class="ing-note">({ing.note})</em>{/if}
            </td>
            <td>{scaleAmt(ing, mult)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
