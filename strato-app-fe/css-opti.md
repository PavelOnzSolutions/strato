## High-impact GPU-load optimizations for `src/index.css`

The biggest GPU/compositing costs in this stylesheet come from:

1. **Large `backdrop-filter: blur(...)` surfaces**
2. **Animated gradients via `background-position`**
3. **Large blurred pseudo-elements / orbs**
4. **`filter`, `drop-shadow`, `text-shadow`, and `box-shadow` animations**
5. **Overuse of `transition: all`**
6. **Many global `!important` overrides that can make style recalculation harder to reason about**

Below are the most worthwhile optimizations.

---

## 1. Reduce very large `backdrop-filter` blur values

You have many glass styles using `blur(40px)`, `blur(50px)`, and `blur(60px)`. These are expensive because the browser must sample and blur pixels behind the element every frame if anything behind it changes.

Examples:

```css
backdrop-filter: blur(50px) saturate(180%) brightness(100%);
backdrop-filter: blur(60px) saturate(180%) brightness(80%);
backdrop-filter: blur(40px) saturate(210%) brightness(110%);
```


### Suggested direction

Use a smaller shared blur scale:

```css
:root {
  --glass-blur-sm: 8px;
  --glass-blur-md: 16px;
  --glass-blur-lg: 24px;
}
```


Then replace most `40px–60px` values with `16px–24px`.

For example:

```css
/* ... existing code ... */

:root, .light, .light-theme {
  --glass-bg: rgba(255, 255, 255, 0.2);
  --glass-border: rgba(255, 255, 255, 0.6);
  --glass-border-hover: rgba(255, 255, 255, 0.85);
  --glass-highlight: rgba(255, 255, 255, 0.9);
  --glass-shadow: rgba(0, 0, 0, 0.04);
  --glass-blur-sm: 8px;
  --glass-blur-md: 16px;
  --glass-blur-lg: 24px;
  --navbar-glass-bg: rgba(255, 255, 255, 0.55);
  --footer-glass-bg: rgba(255, 255, 255, 0.45);
  --sidebar-glass-bg: rgba(255, 255, 255, 0.5);
  --dropdown-glass-bg: rgba(255, 255, 255, 0.65);
  --dialog-glass-bg: rgba(255, 255, 255, 0.7);
}

/* ... existing code ... */

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur-lg)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur-lg)) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  text-shadow: 0 1px rgba(0, 0, 0, 0.1);
  box-shadow:
          0 4px 24px var(--glass-shadow, rgba(0, 0, 0, 0.08)),
          0 1px 4px var(--glass-shadow, rgba(0, 0, 0, 0.04)),
          inset 0 1px 0 var(--glass-highlight, rgba(255, 255, 255, 0.5)),
          inset 0 -1px 0 rgba(255, 255, 255, 0.1);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ... existing code ... */
```


### Why this helps

`backdrop-filter` is one of the most expensive CSS visual effects. Reducing `60px` to `16px–24px` often has a much bigger effect than micro-optimizing normal shadows or colors.

---

## 2. Avoid animating `background-position` on large elements

Several animations animate gradients by changing `background-position`:

```css
.animate-gradient
.animate-plasma-text
.animated-gradient-bg
.gradient-border::after
.gradient-border-animated::before
.animate-faerie-text
```


Animating `background-position` usually causes repainting rather than cheap compositor-only animation. This can be especially costly on full-page backgrounds or large text blocks.

### Better approach

For large visual areas, animate a pseudo-element with `transform` instead of animating `background-position`.

For example, instead of:

```css
.animated-gradient-bg {
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}
```


Prefer:

```css
.animated-gradient-bg {
  position: relative;
  overflow: hidden;
  background: var(--fidoo-2);
}

.animated-gradient-bg::before {
  content: '';
  position: absolute;
  inset: -25%;
  background: linear-gradient(
    -45deg,
    var(--fidoo-1),
    var(--fidoo-3),
    var(--fidoo-5),
    var(--fidoo-2)
  );
  transform: translate3d(0, 0, 0);
  animation: gradient-layer-shift 18s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes gradient-layer-shift {
  from {
    transform: translate3d(-8%, -4%, 0) scale(1.05);
  }

  to {
    transform: translate3d(8%, 4%, 0) scale(1.05);
  }
}
```


This still has paint cost for the gradient layer, but movement is more compositor-friendly than continuously recalculating background positions.

---

## 3. Add a global reduced-motion fallback

There are many infinite animations:

- Plasma text
- Orbs
- Shimmer
- Pulse glow
- Floating
- Fireflies
- Forest mist
- Gradient borders
- Pulsating buttons
- Glow turbulence

A `prefers-reduced-motion` block would immediately reduce GPU/CPU usage for users who opt into it and for low-power devices if you later add a class toggle.

Recommended:

```css
/* ... existing code ... */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }

  .animate-gradient,
  .animate-gradient-radial,
  .animate-plasma-text,
  .animated-gradient-bg,
  .orb-bg::before,
  .orb-bg::after,
  .shimmer::after,
  .pulse-glow,
  .float,
  .gradient-border::after,
  .gradient-border-animated::before,
  .animate-glow-turbulence,
  .auth-forest-mist,
  .auth-forest-mist::before,
  .auth-forest-mist::after,
  .auth-forest-fireflies::before,
  .auth-forest-fireflies::after,
  .animate-faerie-text {
    animation: none !important;
  }

  .blur-reveal {
    filter: none;
    opacity: 1;
    transform: none;
  }
}

/* ... existing code ... */
```


### Why this helps

This is a low-risk optimization and also improves accessibility.

---

## 4. Replace `transition: all`

This appears in several places:

```css
.glass-card {
  transition: all 0.3s cubic-bezier(...);
}

.btn-modern {
  transition: all 0.3s ease;
}

.radix-themes .rt-DropdownMenuItem,
.radix-themes .rt-ContextMenuItem,
.radix-themes .rt-SelectItem {
  transition: all 0.15s ease !important;
}
```


`transition: all` can accidentally animate expensive properties like width, height, filter, border, backdrop-filter, background, etc.

### Suggested replacement

Use explicit compositor-friendly or necessary properties:

```css
/* ... existing code ... */

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(50px) saturate(180%) brightness(100%);
  -webkit-backdrop-filter: blur(50px) saturate(180%) brightness(100%);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  text-shadow: 0 1px rgba(0, 0, 0, 0.1);
  box-shadow:
          0 4px 24px var(--glass-shadow, rgba(0, 0, 0, 0.08)),
          0 1px 4px var(--glass-shadow, rgba(0, 0, 0, 0.04)),
          inset 0 1px 0 var(--glass-highlight, rgba(255, 255, 255, 0.5)),
          inset 0 -1px 0 rgba(255, 255, 255, 0.1);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ... existing code ... */

.btn-modern {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease,
              background-color 0.3s ease,
              color 0.3s ease;
}

/* ... existing code ... */

.radix-themes .rt-DropdownMenuItem,
.radix-themes .rt-ContextMenuItem,
.radix-themes .rt-SelectItem {
  transition: background-color 0.15s ease,
              transform 0.15s ease !important;
  border-radius: 6px !important;
}

/* ... existing code ... */
```


---

## 5. Reduce hover transforms on many repeated elements

This rule can be expensive if applied to many cards in grids/lists:

```css
.hover-lift:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}
```


The transform itself is fine, but the large shadow can be expensive across many elements.

### Suggested lighter version

```css
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}
```


Also consider only using `.hover-lift` on a small number of visible cards, not long lists.

---

## 6. Limit `will-change` usage, but add it selectively

Do **not** add `will-change` globally. It can increase memory usage. But for elements that are constantly transformed, it can help.

Good candidates:

```css
.float,
.auth-forest-mist,
.auth-forest-fireflies::before,
.auth-forest-fireflies::after,
.orb-bg::before,
.orb-bg::after {
  will-change: transform, opacity;
}
```


Avoid adding `will-change` for:

```css
filter
backdrop-filter
box-shadow
background-position
```


Those are expensive even if promoted.

---

## 7. Optimize large blurred orb backgrounds

This is expensive:

```css
.orb-bg::before,
.orb-bg::after {
  filter: blur(80px);
  width: 600px;
  height: 600px;
  animation: float-orb 20s ease-in-out infinite;
}
```


Large blurred moving blobs are costly.

### Suggested reduction

```css
/* ... existing code ... */

.orb-bg::before,
.orb-bg::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.35;
  animation: float-orb 28s ease-in-out infinite;
  pointer-events: none;
  will-change: transform, opacity;
}

.orb-bg::before {
  width: 420px;
  height: 420px;
  background: var(--fidoo-9);
  top: -140px;
  right: -140px;
  animation-delay: 0s;
}

.orb-bg::after {
  width: 360px;
  height: 360px;
  background: var(--accent-9);
  bottom: -120px;
  left: -120px;
  animation-delay: -14s;
}

/* ... existing code ... */
```


### Why this helps

Blur radius and surface area multiply the cost. Reducing both dimensions and blur has a strong effect.

---

## 8. Use `content-visibility` for below-the-fold sections

For large pages, add a utility class:

```css
/* ... existing code ... */

.content-visibility-auto {
  content-visibility: auto;
  contain-intrinsic-size: 600px;
}

/* ... existing code ... */
```


Then apply it to heavy below-the-fold page sections, dashboards, lists, or documentation blocks.

### Why this helps

The browser can skip layout/paint for off-screen content. This reduces CPU more than GPU, but it indirectly reduces frame pressure.

---

## 9. Consider `contain` for isolated visual components

For cards, popovers, toast roots, and animated background containers, containment can reduce repaint/layout invalidation.

Suggested utilities:

```css
/* ... existing code ... */

.paint-contained {
  contain: paint;
}

.layout-paint-contained {
  contain: layout paint;
}

/* ... existing code ... */
```


Potential candidates:

```css
.glass-card
.toast-root
.orb-bg
.shimmer
.gradient-border
.gradient-border-animated
```


Be careful with `contain: paint` on components that rely on overflow effects like shadows outside bounds. It can clip visual effects in some layouts.

---

## 10. Consolidate repeated glass rules

There is a lot of overlap between:

```css
.glass
.glass-light
.glass-dark
.glass-card
.radix dropdown content
.radix popover content
.radix tooltip content
.radix dialog content
.toast-root
```


The repeated pattern is:

- translucent background
- `backdrop-filter`
- border
- box-shadow
- inset highlight

You can reduce CSS size and make future tuning easier with shared variables/classes.

Example direction:

```css
.glass-surface {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur-md)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur-md)) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 4px 24px var(--glass-shadow),
    inset 0 1px 0 var(--glass-highlight);
}
```


Then specific components only define radius, padding, or stronger/lighter variants.

This won’t directly reduce GPU cost unless blur values are reduced, but it makes the optimization maintainable.

---

## 11. Avoid animating `filter: drop-shadow(...)`

This is expensive:

```css
@keyframes pulsating-glow {
  0% {
    filter: drop-shadow(...);
  }

  50% {
    filter: drop-shadow(...);
  }

  100% {
    filter: drop-shadow(...);
  }
}
```


And:

```css
.animate-faerie-text {
  filter: drop-shadow(...);
}
```


### Suggested direction

Use a static shadow, or animate opacity on a pseudo-element instead.

For buttons, prefer:

```css
.radix-themes .rt-Button.rt-variant-solid:hover {
  box-shadow: 0 0 12px var(--accent-a6);
}
```


instead of an infinite animated `filter`.

If you want movement, animate a pseudo-element’s `transform`/`opacity`, not the filter.

---

## 12. Fix suspicious / ineffective CSS

This rule likely has a typo:

```css
.animate-gradient-radial {
  background-size: 200% 200%;
  animation: gradient- 3s ease infinite;
}
```


`gradient-` is not a defined keyframe. The browser will ignore this animation, but it is confusing and worth removing or fixing.

Suggested:

```css
.animate-gradient-radial {
  background-size: 200% 200%;
  animation: gradient-xy 3s ease infinite;
}
```


Or remove the rule if unused.

---

## 13. Be careful with global font selector

This selector is broad:

```css
*:not(.monaco-editor):not(.monaco-editor *) {
  font-family: var(--default-font), sans-serif;
}
```


This affects every element and pseudo-matches broadly. It is not mainly a GPU issue, but it can increase style matching work.

Prefer:

```css
body {
  font-family: var(--default-font), sans-serif;
}
```


Then override Monaco and code fonts separately.

Potential replacement:

```css
/* ... existing code ... */

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  font-family: var(--default-font), sans-serif;
}

pre, code, kbd, samp, .font-mono {
  font-family: var(--code-font), monospace !important;
}

/* ... existing code ... */
```


And remove:

```css
*:not(.monaco-editor):not(.monaco-editor *) {
  font-family: var(--default-font), sans-serif;
}
```


---

## 14. Reduce text-shadow layers on animated text

Examples:

```css
.text-glow {
  text-shadow:
    0 0 4px rgb(var(--accent-9) / 0.6),
    0 0 12px rgb(var(--accent-8) / 0.8),
    0 0 32px rgb(var(--accent-8) / 1);
}
```


And animated glow turbulence changes multiple `text-shadow` values over time.

Multiple large text shadows can be costly, especially if text is animated or frequently changing.

### Suggested lighter default

```css
.text-glow {
  color: var(--accent-11);
  text-shadow: 0 0 8px var(--accent-a7);
}
```


For animated glow turbulence, consider disabling it on mobile or under reduced motion.

---

## 15. Add mobile-specific visual reductions

Mobile GPUs are most sensitive to blur, filters, and moving gradients.

Recommended:

```css
/* ... existing code ... */

@media (max-width: 768px) {
  .glass,
  .glass-light,
  .glass-dark,
  .glass-card,
  .radix-themes .rt-DropdownMenuContent,
  .radix-themes .rt-ContextMenuContent,
  .radix-themes .rt-SelectContent,
  .radix-themes .rt-PopoverContent,
  .radix-themes .rt-TooltipContent,
  .radix-themes .rt-TableRoot.rt-variant-surface,
  .toast-root {
    backdrop-filter: blur(12px) saturate(140%) !important;
    -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  }

  .orb-bg::before,
  .orb-bg::after {
    filter: blur(28px);
    opacity: 0.25;
  }

  .animate-glow-turbulence,
  .pulse-glow,
  .shimmer::after {
    animation: none !important;
  }
}

/* ... existing code ... */
```


---

## 16. Use CSS cascade layers for maintainability

Since this file imports Tailwind and then defines theme overrides, component utilities, Radix overrides, and animations, cascade layers would make specificity and override behavior cleaner.

Example structure:

```css
@import "tailwindcss";

@layer theme {
  :root {
    --default-font: 'Sansation';
    --code-font: 'Fira Code';
  }

  /* color tokens */
}

@layer base {
  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
  }
}

@layer utilities {
  .glass-card {
    /* ... */
  }

  .hover-lift {
    /* ... */
  }
}

@layer overrides {
  .radix-themes .rt-DialogContent {
    /* ... */
  }
}
```


This is not primarily a GPU optimization, but it can reduce reliance on `!important` and make performance-sensitive overrides easier to manage.

---

# Prioritized checklist

If you want the biggest client GPU improvement with the least visual loss, I would do this order:

1. **Reduce `backdrop-filter` blur from `40–60px` to `12–24px`.**
2. **Add `prefers-reduced-motion` fallback.**
3. **Replace `transition: all` with explicit properties.**
4. **Reduce moving orb size and `blur(80px)` to around `28–40px`.**
5. **Stop animating `filter`, `drop-shadow`, and large `text-shadow` effects.**
6. **Avoid animated `background-position` on large surfaces.**
7. **Add mobile-specific reductions.**
8. **Consolidate glass styles into shared variables/classes.**
9. **Use `content-visibility: auto` for heavy below-the-fold sections.**
10. **Remove the global universal font selector in favor of `body`.**

The main performance concern is not the color token section; it is the combination of **large glass blur**, **infinite gradient/background animations**, **large blurred pseudo-elements**, and **animated shadows/filters**.