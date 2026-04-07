<script lang="ts">
  import { onMount } from 'svelte';
  import { servingsStore } from '../stores/scaler';

  // ── Props ────────────────────────────────────────────────────────
  export let ingredients: {
    name: string; amount: number | null; unit: string;
    scale: string; note: string;
  }[] = [];
  export let steps: string[] = [];
  export let dishName: string = '';
  export let baseServings: number = 2;
  export let t: {
    enterCooking: string; prepMode: string; cookMode: string;
    prepReady: string; startCooking: string; prev: string; next: string;
    done: string; exit: string; step: string; of: string;
    timer: string; start: string; pause: string; reset: string;
    min: string; timerDone: string; allPrepped: string; tapToExpand: string;
    toTaste: string;
  };
  // Reactive servings from the shared store (set by Scaler.svelte)
  $: scalerServings = $servingsStore;

  // ── State ────────────────────────────────────────────────────────
  let open = false;
  let mode: 'prep' | 'cook' = 'prep';
  let currentStep = 0;
  let checked: boolean[] = [];
  $: checked = ingredients.map(() => false);
  $: checkedCount = checked.filter(Boolean).length;
  $: prepPct = ingredients.length ? (checkedCount / ingredients.length) * 100 : 0;

  // Timer
  let timerTarget = 0;
  let timerSeconds = 0;
  let timerRunning = false;
  let timerExpired = false;
  let timerExpanded = true;
  let _interval: ReturnType<typeof setInterval> | null = null;
  let audioCtx: AudioContext | null = null;
  let isMobile = false;

  onMount(() => {
    isMobile = window.innerWidth <= 768;
    window.addEventListener('resize', () => { isMobile = window.innerWidth <= 768; });
  });

  // ── Ingredient scaling ───────────────────────────────────────────
  const FRACTIONS: Record<number, string> = {
    0.25:'¼', 0.5:'½', 0.75:'¾', 1.25:'1¼', 1.5:'1½', 1.75:'1¾',
    2.25:'2¼', 2.5:'2½', 2.75:'2¾', 3.25:'3¼', 3.5:'3½', 3.75:'3¾',
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
  function scaleAmt(ing: typeof ingredients[0]): string {
    const mult = baseServings > 0 ? scalerServings / baseServings : 0;
    if (ing.scale === 'to_taste') return t.toTaste;
    if (ing.scale === 'fixed' || ing.amount == null)
      return ing.amount != null ? `${ing.amount}${ing.unit}` : t.toTaste;
    const raw = ing.amount * mult;
    if (ing.scale === 'discrete') {
      const snapped = Math.max(0.5, Math.round(raw * 2) / 2);
      if (snapped === Math.floor(snapped)) return `${Math.floor(snapped)}${ing.unit}`;
      const w = Math.floor(snapped);
      return w === 0 ? `½${ing.unit}` : `${w}½${ing.unit}`;
    }
    return `${fmt(raw)}${ing.unit}`;
  }

  // ── Overlay ──────────────────────────────────────────────────────
  function openOverlay() {
    mode = 'prep';
    currentStep = 0;
    checked = ingredients.map(() => false);
    open = true;
    document.body.style.overflow = 'hidden';
  }
  function closeOverlay() {
    open = false;
    document.body.style.overflow = '';
    stopTimer();
  }

  // ── Cook navigation ──────────────────────────────────────────────
  function goNext() {
    if (currentStep < steps.length - 1) currentStep++;
    else closeOverlay();
  }
  function goPrev() {
    if (currentStep > 0) currentStep--;
  }

  // ── Timer ────────────────────────────────────────────────────────
  function setTimer(mins: number) {
    stopTimer();
    timerTarget = mins * 60;
    timerSeconds = timerTarget;
    timerExpired = false;
    startTimer();
  }
  function startTimer() {
    if (timerSeconds === 0) return;
    timerExpired = false;
    timerRunning = true;
    _interval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
      } else {
        stopTimer();
        timerExpired = true;
        playBeeps();
      }
    }, 1000);
  }
  function toggleTimer() {
    if (timerRunning) { stopTimer(); }
    else { startTimer(); }
  }
  function stopTimer() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    timerRunning = false;
  }
  function resetTimer() {
    stopTimer();
    timerSeconds = timerTarget;
    timerExpired = false;
  }
  function fmtTime(s: number): string {
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }
  function playBeeps() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = (t: number) => {
        const osc = audioCtx!.createOscillator();
        const g   = audioCtx!.createGain();
        osc.connect(g); g.connect(audioCtx!.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
      };
      const now = audioCtx!.currentTime;
      beep(now); beep(now + 0.35); beep(now + 0.70);
    } catch {}
  }

  // ── Custom timer input ───────────────────────────────────────────
  let customMins = '';
  function onCustomTimer() {
    const v = parseInt(customMins);
    if (v > 0) { setTimer(v); customMins = ''; }
  }

  // ── Keyboard ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (mode === 'cook') {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') closeOverlay();
    } else {
      if (e.key === 'Escape') closeOverlay();
    }
  }

  // ── Swipe ────────────────────────────────────────────────────────
  let swipeX = 0;
  function swipeStart(e: TouchEvent) { swipeX = e.touches[0].clientX; }
  function swipeEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - swipeX;
    if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
  }

  // ── Slot machine step positions ──────────────────────────────────
  const SLOT_H = 90;
  function stepTransform(idx: number): string {
    const rel = idx - currentStep;
    let scale: number, opacity: number;
    if      (rel === 0)  { scale = 1;    opacity = 1; }
    else if (rel === -1) { scale = 0.75; opacity = 0.28; }
    else if (rel < -1)   { scale = 0.65; opacity = 0; }
    else if (rel === 1)  { scale = 0.80; opacity = 0.65; }
    else if (rel === 2)  { scale = 0.70; opacity = 0.38; }
    else if (rel === 3)  { scale = 0.62; opacity = 0.18; }
    else                 { scale = 0.58; opacity = 0; }
    const rel_str = rel === 0 ? '' : ` + ${rel * SLOT_H}px`;
    return `transform: translateY(calc(-50%${rel_str})) scale(${scale}); opacity: ${opacity};`;
  }

  function boldify(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  $: progressPct = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;
</script>

<svelte:window on:keydown={onKey} />

<!-- Entry button -->
<div class="cm-entry">
  <button class="cm-open-btn" on:click={openOverlay}>{t.enterCooking}</button>
</div>

{#if open}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="cm-overlay" class:cm-visible={open} role="dialog" aria-modal="true">

  <!-- ═══════════════ PREP MODE ═══════════════ -->
  {#if mode === 'prep'}
  <div class="cm-screen">
    <header class="cm-header">
      <span class="cm-dish-name">{dishName}</span>
      <span class="cm-badge cm-badge-prep">{t.prepMode}</span>
      <button class="cm-exit-btn" on:click={closeOverlay}>✕</button>
    </header>

    <div class="cm-prep-body">
      <!-- Progress -->
      <div class="cm-prep-progress">
        <div class="cm-prep-progress-row">
          <span class="cm-prep-count">
            {checkedCount} <span class="cm-prep-sep">/</span> {ingredients.length}
          </span>
          <span class="cm-prep-label">{t.prepReady}</span>
        </div>
        <div class="cm-prep-bar-wrap">
          <div class="cm-prep-bar" style="width:{prepPct}%"></div>
        </div>
      </div>

      <!-- Ingredient checklist -->
      <ul class="cm-ing-list">
        {#each ingredients as ing, idx}
          <li class="cm-ing-item" class:cm-checked={checked[idx]}>
            <label class="cm-ing-label">
              <input
                type="checkbox"
                class="cm-ing-checkbox"
                bind:checked={checked[idx]}
              />
              <span class="cm-ing-check-vis"></span>
              <div class="cm-ing-name-wrap">
                <span class="cm-ing-name">{ing.name}</span>
                {#if ing.note}<span class="cm-ing-note">{ing.note}</span>{/if}
              </div>
              <span class="cm-ing-amt">{scaleAmt(ing)}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>

    <footer class="cm-footer">
      <button
        class="cm-action-btn"
        class:cm-btn-glow={checkedCount === ingredients.length && ingredients.length > 0}
        on:click={() => { mode = 'cook'; }}
      >{t.startCooking}</button>
    </footer>
  </div>

  <!-- ═══════════════ COOK MODE ═══════════════ -->
  {:else}
  <div class="cm-screen">
    <header class="cm-header">
      <span class="cm-dish-name">{dishName}</span>
      <div class="cm-cook-meta">
        <span class="cm-badge cm-badge-cook">{t.cookMode}</span>
        <span class="cm-step-counter">{t.step} {currentStep + 1}{t.of}{steps.length}</span>
      </div>
      <button class="cm-exit-btn" on:click={closeOverlay}>✕</button>
    </header>

    <!-- Progress bar -->
    <div class="cm-progress-wrap">
      <div class="cm-progress-bar" style="width:{progressPct}%"></div>
    </div>

    <div class="cm-cook-layout">
      <!-- Steps drum -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="cm-steps-panel"
        on:touchstart={swipeStart}
        on:touchend={swipeEnd}
      >
        <div class="cm-steps-drum">
          {#each steps as step, idx}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cm-step"
              class:cm-step-current={idx === currentStep}
              style={stepTransform(idx)}
              on:click={() => { if (idx === currentStep) goNext(); }}
            >
              <span class="cm-step-num">{idx + 1}</span>
              <div class="cm-step-text">{@html boldify(step)}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Timer -->
      <aside class="cm-timer-panel">
        <div
          class="cm-timer-header"
          on:click={() => { if (isMobile) timerExpanded = !timerExpanded; }}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key==='Enter' && isMobile && (timerExpanded=!timerExpanded)}
        >
          <span>{t.timer}</span>
        </div>
        <div class="cm-timer-body" class:cm-timer-open={timerExpanded || !isMobile}>
          <div
            class="cm-timer-display"
            class:cm-timer-expired={timerExpired}
          >{fmtTime(timerSeconds)}</div>

          <div class="cm-timer-presets">
            {#each [1,3,5,10] as mins}
              <button class="cm-preset-btn" on:click={() => setTimer(mins)}>{mins}m</button>
            {/each}
          </div>

          <div class="cm-timer-custom">
            <input
              type="number"
              min="1" max="99"
              placeholder="—"
              bind:value={customMins}
              on:change={onCustomTimer}
              class="cm-custom-input"
            />
            <span>{t.min}</span>
          </div>

          <div class="cm-timer-controls">
            <button
              class="cm-timer-btn cm-btn-start"
              on:click={toggleTimer}
              disabled={timerSeconds === 0 && !timerRunning}
            >{timerRunning ? t.pause : t.start}</button>
            <button class="cm-timer-btn cm-btn-reset" on:click={resetTimer}>{t.reset}</button>
          </div>
        </div>
      </aside>
    </div>

    <footer class="cm-footer cm-cook-footer">
      <button class="cm-nav-btn" disabled={currentStep === 0} on:click={goPrev}>{t.prev}</button>
      <span class="cm-step-display">{currentStep + 1} {t.of} {steps.length}</span>
      <button
        class="cm-nav-btn"
        class:cm-btn-done={currentStep >= steps.length - 1}
        on:click={goNext}
      >{currentStep >= steps.length - 1 ? t.done : t.next}</button>
    </footer>
  </div>
  {/if}

</div>
{/if}

<style>
/* ── Entry ───────────────────────────────────────────────────────── */
.cm-entry { margin: 16px 0 32px; }
.cm-open-btn {
  background: var(--bg-elevated);
  border: 2px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  letter-spacing: 0.04em;
}
.cm-open-btn:hover {
  background: var(--accent);
  color: #0d1117;
  box-shadow: 0 0 16px rgba(230,168,23,0.4);
}

/* ── Overlay ─────────────────────────────────────────────────────── */
.cm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg);
  font-family: var(--font-mono);
  display: flex;
  flex-direction: column;
  animation: cm-fade-in 0.25s ease forwards;
}
@keyframes cm-fade-in { from { opacity: 0 } to { opacity: 1 } }

/* ── Screen ──────────────────────────────────────────────────────── */
.cm-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────── */
.cm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  min-height: 52px;
}
.cm-dish-name {
  flex: 1;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cm-cook-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.cm-badge {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: var(--radius);
  font-weight: 700;
  flex-shrink: 0;
}
.cm-badge-prep {
  background: rgba(63,185,80,0.12);
  color: var(--green);
  border: 1px solid var(--green);
}
.cm-badge-cook {
  background: rgba(230,168,23,0.12);
  color: var(--accent);
  border: 1px solid var(--accent);
}
.cm-step-counter {
  font-size: 0.8rem;
  color: var(--text-muted);
  flex-shrink: 0;
}
.cm-exit-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 32px; height: 32px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}
.cm-exit-btn:hover { border-color: var(--red); color: var(--red); }

/* ── Progress bar (cook) ─────────────────────────────────────────── */
.cm-progress-wrap {
  height: 3px;
  background: var(--bg-elevated);
  flex-shrink: 0;
}
.cm-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
}

/* ── Prep body ───────────────────────────────────────────────────── */
.cm-prep-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
}
.cm-prep-progress {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.cm-prep-progress-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cm-prep-count {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
}
.cm-prep-sep { color: var(--text-muted); font-weight: 400; margin: 0 4px; }
.cm-prep-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.cm-prep-bar-wrap {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.cm-prep-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
}

/* ── Ingredient list ─────────────────────────────────────────────── */
.cm-ing-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cm-ing-item {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  transition: border-color 0.25s, background 0.25s, opacity 0.3s;
  overflow: hidden;
}
.cm-ing-item.cm-checked {
  background: rgba(63,185,80,0.06);
  border-color: rgba(63,185,80,0.35);
  opacity: 0.65;
}
.cm-ing-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  min-height: 52px;
  user-select: none;
}
.cm-ing-label:hover { background: rgba(255,255,255,0.03); }

/* Hidden native checkbox */
.cm-ing-checkbox {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;
  pointer-events: none;
}

/* Custom checkbox visual */
@keyframes cm-pop {
  0%  { transform: scale(1); }
  40% { transform: scale(1.25); }
  100%{ transform: scale(1); }
}
.cm-ing-check-vis {
  width: 22px;
  min-width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--bg);
  position: relative;
  transition: border-color 0.2s, background 0.2s;
  flex-shrink: 0;
}
.cm-ing-check-vis::after {
  content: '';
  position: absolute;
  left: 5px; top: 2px;
  width: 6px; height: 11px;
  border: 2px solid transparent;
  border-top: none; border-left: none;
  transform: rotate(45deg) scale(0);
  transform-origin: center center;
  transition: transform 0.18s ease 0.04s, border-color 0.15s;
}
.cm-checked .cm-ing-check-vis {
  background: var(--green);
  border-color: var(--green);
  animation: cm-pop 0.28s ease forwards;
}
.cm-checked .cm-ing-check-vis::after {
  border-color: #0d1117;
  transform: rotate(45deg) scale(1);
}

/* Name + note */
.cm-ing-name-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cm-ing-name {
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
  transition: color 0.25s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cm-checked .cm-ing-name {
  color: var(--text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--green);
}
.cm-ing-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Amount pill */
.cm-ing-amt {
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  flex-shrink: 0;
  color: var(--accent);
  background: rgba(230,168,23,0.1);
  border: 1px solid rgba(230,168,23,0.25);
  padding: 3px 10px;
  border-radius: 12px;
  transition: color 0.25s, background 0.25s, border-color 0.25s;
}
.cm-checked .cm-ing-amt {
  color: var(--text-muted);
  background: transparent;
  border-color: var(--border);
}

/* ── Footer ──────────────────────────────────────────────────────── */
.cm-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  gap: 16px;
  flex-shrink: 0;
}
.cm-cook-footer { justify-content: space-between; }

.cm-action-btn {
  background: var(--bg-elevated);
  border: 2px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  padding: 10px 28px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.2s;
  letter-spacing: 0.04em;
  min-height: 48px;
}
.cm-action-btn:hover { background: var(--accent); color: #0d1117; }
@keyframes cm-pulse {
  0%,100% { box-shadow: 0 0 10px rgba(230,168,23,0.4); }
  50%      { box-shadow: 0 0 24px rgba(230,168,23,0.7); }
}
.cm-btn-glow { animation: cm-pulse 2s ease-in-out infinite; }

.cm-nav-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  padding: 8px 18px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  min-height: 44px; min-width: 100px;
}
.cm-nav-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.cm-nav-btn:disabled { opacity: 0.3; cursor: default; }
.cm-btn-done { border-color: var(--green); color: var(--green); }
.cm-step-display { color: var(--text-muted); font-size: 0.85rem; flex-shrink: 0; }

/* ── Cook layout ─────────────────────────────────────────────────── */
.cm-cook-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Step drum ───────────────────────────────────────────────────── */
.cm-steps-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
  mask-image: linear-gradient(
    to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
}
/* Center highlight rail */
.cm-steps-panel::before {
  content: '';
  position: absolute;
  left: 20px; right: 20px;
  top: 50%;
  height: 90px;
  transform: translateY(-50%);
  background: var(--bg-elevated);
  border: 1px solid rgba(230,168,23,0.18);
  border-left: 3px solid rgba(230,168,23,0.55);
  border-radius: var(--radius);
  pointer-events: none;
  z-index: 0;
}
/* Steps anchor at panel center */
.cm-steps-drum {
  position: absolute;
  top: 50%;
  left: 0; right: 0;
  height: 0;
}
.cm-step {
  position: absolute;
  left: 24px; right: 24px;
  top: 0;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 20px;
  border-radius: var(--radius);
  border-left: 3px solid transparent;
  transform-origin: center center;
  transition: transform 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.38s ease,
              background 0.25s, border-color 0.25s;
  cursor: default;
  will-change: transform, opacity;
  z-index: 5;
}
.cm-step-current {
  border-left-color: var(--accent);
  box-shadow: 0 2px 16px rgba(0,0,0,0.4);
  cursor: pointer;
  z-index: 10;
}
.cm-step-num {
  font-weight: 700;
  color: var(--text-muted);
  min-width: 24px;
  flex-shrink: 0;
  font-size: 0.82rem;
  padding-top: 3px;
  transition: color 0.25s;
}
.cm-step-current .cm-step-num { color: var(--accent); }
.cm-step-text {
  flex: 1;
  color: var(--text-muted);
  font-size: 0.93rem;
  line-height: 1.55;
  transition: color 0.25s, font-size 0.25s;
}
.cm-step-current .cm-step-text {
  color: var(--text);
  font-size: 1.12rem;
  line-height: 1.65;
}
.cm-step-text :global(strong) { color: inherit; font-weight: 700; }

/* ── Timer ───────────────────────────────────────────────────────── */
.cm-timer-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.cm-timer-header {
  padding: 14px 16px 10px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.cm-timer-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  display: none;
}
.cm-timer-open { display: flex !important; }
.cm-timer-display {
  font-size: 2.4rem;
  font-weight: 700;
  text-align: center;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  padding: 8px 0;
  transition: color 0.3s;
}
.cm-timer-expired { color: var(--red) !important; }
.cm-timer-presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.cm-preset-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 6px 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.cm-preset-btn:hover { border-color: var(--accent); color: var(--accent); }
.cm-timer-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.cm-custom-input {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  padding: 6px 10px;
  border-radius: var(--radius);
  min-height: 36px;
  -moz-appearance: textfield;
}
.cm-custom-input::-webkit-inner-spin-button,
.cm-custom-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.cm-custom-input:focus { outline: none; border-color: var(--accent); }
.cm-timer-controls { display: flex; gap: 8px; }
.cm-timer-btn {
  flex: 1;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 7px 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.cm-timer-btn:disabled { opacity: 0.3; cursor: default; }
.cm-btn-start { border-color: var(--accent); color: var(--accent); }
.cm-btn-start:hover:not(:disabled) { background: rgba(230,168,23,0.15); }
.cm-btn-reset:hover { border-color: var(--text-muted); color: var(--text); }

/* ── Mobile ──────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .cm-header { padding: 10px 14px; min-height: 48px; }
  .cm-dish-name { font-size: 0.9rem; }
  .cm-cook-layout { flex-direction: column; }
  .cm-steps-panel { flex: 1; min-height: 260px; }
  .cm-steps-panel::before { left: 12px; right: 12px; }
  .cm-step { left: 16px; right: 16px; }
  .cm-step-current .cm-step-text { font-size: 1.05rem; }
  .cm-timer-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .cm-timer-header {
    cursor: pointer;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
  }
  .cm-timer-header::after {
    content: '▲';
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .cm-timer-body { max-height: 280px; }
  .cm-footer { padding: 10px 14px; }
  .cm-nav-btn { min-width: 80px; font-size: 0.85rem; padding: 8px 12px; }
  .cm-prep-body { padding: 16px 14px; }
  .cm-ing-label { padding: 12px 14px; min-height: 52px; }
}
</style>
