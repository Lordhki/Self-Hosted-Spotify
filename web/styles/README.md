# CSS and theme architecture

This is a migration of the existing listening room, with the original breakpoints,
artwork and video behavior. There is no build step or styling framework.

## Ownership and cascade

`main_menu.html` loads `styles/style.css`. The entry point imports these shared
files in order:

| File | Owns |
| --- | --- |
| `tokens.css` | Shared geometry/typography scales and a complete neutral fallback palette |
| `layout.css` | Page reset, app/sidebar/main/playback structure, background planes, display panels and UI stacking contexts |
| `components.css` | Component geometry, states and token-based appearance |
| `responsive.css` | Existing viewport overrides, in their original order, and reduced-motion rules |

Core styles never select a theme ID. Component geometry stays with its component;
application regions and stacking contexts stay in layout. Responsive rules run
last, preserving width breakpoints at 1120, 960, 768 and 400px and the short-screen
query at height <=720px / width >=769px. No cascade layers were added, avoiding a
change to the existing specificity model.

Each `themes/<id>/ui.css` owns that theme's public appearance properties,
artwork URLs, wallpaper source/rate and theme-color value under
`:root[data-theme="<id>"]`. Shared files contain only neutral defaults and
geometry. Theme files may contain the small artwork selectors needed by that
theme, plus isolated ambient effects and their `prefers-reduced-motion` media
queries. Layout breakpoints remain in shared responsive CSS. All three existing
palettes explicitly supply the complete appearance contract.

## Shared custom property contract

`tokens.css` is the canonical declaration list and contains usable defaults for
every public UI token. Values in the following table are appearance configuration;
themes may override them. `*-background` values accept a CSS background (a solid
color or gradient); `--color-*`, border and slider tokens accept colors unless
otherwise indicated.

| Properties | Meaning |
| --- | --- |
| `--page-background` | Body background; formerly the ambiguous `--color-page`, which also held a gradient |
| `--color-surface`, `--color-surface-panel` | Application surface and secondary/fallback panel color |
| `--color-surface-raised`, `--color-surface-raised-hover` | Selected track, playlist and raised-button surfaces |
| `--color-surface-hover`, `--color-track-hover` | Button and track hover colors |
| `--color-text`, `--color-text-muted`, `--color-text-subtle` | Main, secondary and tertiary content colors |
| `--color-border` | Shared panel and control borders |
| `--color-accent`, `--color-accent-strong`, `--color-accent-soft-bg` | Focus/brand accent, selected/control accent and active-state surface |
| `--color-slider-track` | Default empty slider track color |
| `--sidebar-background`, `--main-background`, `--playback-background` | Region surfaces; transparency is intentional in Magic Forest |
| `--playback-border` | Playback area's subtle top border color |
| `--icon-button-color`, `--icon-button-hover-color`, `--playlist-chevron-color` | Reusable icon states; `currentColor` preserves inherited colors |
| `--color-brand-ink`, `--color-icon-subtle`, `--color-icon-active` | SVG brand, tertiary and active strokes; retain the original literal values across existing themes |
| `--play-indicator-background` | Paused play triangle's background, including the original gradient in Magic Forest |
| `--lyrics-canvas-border`, `--lyrics-canvas-glow` | Lyric/video panel border and radial glow colors |
| `--lyrics-canvas-glow-position`, `--lyrics-canvas-angle`, `--lyrics-canvas-middle-stop` | Decorative gradient position, angle and stop; never application geometry |
| `--lyrics-canvas-start`, `--lyrics-canvas-middle`, `--lyrics-canvas-end`, `--lyrics-text-muted` | Lyric/video panel gradient colors and secondary lyric color |
| `--badge-background`, `--badge-border` | Session badge surface and border color |
| `--timeline-track-fill`, `--timeline-track-empty`, `--timeline-thumb` | Independent timeline colors |
| `--volume-track-fill`, `--volume-track-empty`, `--volume-thumb` | Independent volume colors |

The following shared tokens describe geometry and must **not** be overridden by
a theme: `--sidebar-width`, `--header-height`, `--page-padding`, `--section-gap`,
`--text-2xs`/`xs`/`sm`/`md`/`lg`/`xl`/`2xl`, `--control-size`, `--play-size`,
`--artwork-small`, `--artwork-large`, `--volume-width`, and
`--space-2xs`/`xs`/`sm`/`md`/`lg`. `color-scheme: dark` is shared as before.

`--range-fill`, `--range-empty` and `--range-thumb` are private per-slider aliases
in `components.css`. `player.js` owns each input's `--range-progress` percentage;
these are not theme configuration. Transparent backgrounds, zero dimensions,
standard focus geometry and the favorite heart's semantic pink remain ordinary
component values rather than unnecessary palette tokens.

## Loading and switching themes

`components/theme.js` runs once in the head, before the body is parsed. Its small
registry maps IDs to labels and UI stylesheet paths. The active stylesheet
exposes theme color, wallpaper source and playback rate through CSS custom
properties. URLs resolve against the stylesheet URL so serving either the
repository or `web/` directly works.

The controller reads `lowave-theme` from localStorage and normalizes unknown IDs
to Starlight. `activeTheme` is the only authoritative active state. A pending
request is separate from that state. A new link downloads with `media="not all"`;
on successful load, one synchronous commit enables it, updates `data-theme`,
metadata, labels, next-theme accessibility text, storage and wallpaper, and
removes the old link. Theme scoping and inactive staging prevent mixed palettes.
The active link has ID `theme-stylesheet`.

Repeating the active selection reuses its loaded link. Duplicate pending requests
share one promise. Rapid clicks advance the requested selection and cancel stale
loads; returning to the still-active selection does not reload its stylesheet.
The toggle stays available while loading, with `aria-busy` describing that state.

On initial load the body is hidden until the selected palette and its controls
are ready, including when a cached palette finishes before DOMContentLoaded. Each
request has a five-second timeout. An initial failure tries Starlight; if that
also fails, the neutral core tokens reveal a usable UI (at most two timeouts).
Failed switches keep the existing theme, preference, labels and wallpaper and
log a warning. A later toggle can recover. Storage failures log warnings but do
not prevent switching. If JavaScript cannot run at all, the body is never hidden
and the core fallback palette remains usable.

## Add a theme

1. Create `themes/<id>/ui.css`. Copy an existing palette's declaration list, scope
   it to the new ID and edit appearance tokens only. Keep resource paths relative
   to the CSS file when resources are needed in a later background phase.
2. Add one registry entry in `components/theme.js` with a unique `id`, `label`
   and `stylesheet`. Put `--theme-color`, `--theme-wallpaper-src` and
   `--theme-wallpaper-rate` in the theme's `ui.css`; keep artwork configuration
   there too.
3. Test switching, reload, failed loads, and the existing viewports. No shared CSS
   changes are needed for an ordinary UI palette. Add an appearance token with a
   neutral default, or a reusable component variant, for a new component need.

Custom background artwork stays with the theme that owns it. Shared layout only
provides the neutral artwork plane and video geometry.

## Background and wallpaper dependencies

- `body.listening-page` creates an isolated page context. Its fixed `::before`
  artwork occupies z-index 0 for Starlight/Quiet. Starlight uses a transparent
  app, sidebar, main and playback surfaces so its SVG remains untinted at full
  opacity. Lyric/video canvas gradient colors are transparent as well; control
  surfaces and panel borders remain independent.
  Quiet explicitly has no static artwork.
- Magic Forest disables that body pseudo-element and uses `.background-artwork`
  with separate image and overlay pseudo-elements at z-index 0. The distinction
  preserves their original opacity/compositing behavior.
- `.app` is always positioned at z-index 1. The sidebar is always positioned and
  isolated in shared layout; Magic Forest's `sidebar::before` sits at -1 inside
  that context. Background planes ignore pointer events. `.lyric-meta` has its
  existing local z-index 1; `.video-panel` retains its isolated clipping context.
- `--background-artwork`, `--background-artwork-opacity`,
  `--background-artwork-size`, `--background-artwork-overlay` and
  `--sidebar-artwork-opacity` have neutral defaults in `tokens.css`; their
  per-theme values and URLs live in each theme's `ui.css`.
- Artwork assets remain at `themes/starlight/Starlight.svg` and
  `themes/magic-forest/MagicForest.jpg`. CSS URLs stay relative to each theme
  stylesheet. Magic Forest's sidebar uses the original
  `background-size: 100vw 100vh`, including its existing mobile/scroll behavior.
- `.wallpaper-layer` and its cover-sized video keep the original geometry. One
  persistent muted, looping, inline video switches sources without replacing the
  element. Theme CSS exposes these values: Starlight uses
  `assets/starlight/6.mp4` at **0.1**, Quiet uses `assets/quiet/1.mp4` at
  **0.5**, and Magic Forest uses
  `themes/magic-forest/magic-forest.mp4` at normal speed (**1**). The Magic
  Forest video is stored with Git LFS; run
  `git lfs pull` after cloning to download it before serving the prototype.
  Visibility changes pause/resume that same video.
- `.ambient-effects` is a fixed, clipped, non-interactive layer at z-index 0,
  after artwork and below `.app`. Shared layout hides it by default. Magic Forest
  enables it; Starlight and Quiet ambient effects remain planned.

The redundant Magic Forest `.app` z-index override, duplicate mobile sidebar
width/implicit stretch, overwritten artwork declaration, duplicated section
heading and repeated base flex-alignment declarations were removed. The invalid
Magic Forest `color: var(--color-page)` (a gradient in a color property) simply
inherited text color; shared inheritance now preserves that effective result.
No artwork system or iframe was introduced by the migration. Magic Forest ambient
animation was added afterward, as described below.

## Magic Forest ambient leaves

The three existing `.ambient-effects__meteor` spans render nine independent
leaves without JavaScript or markup changes. Each stationary span paints one
leaf with an animated box shadow; its two pseudo-elements render the other two.
Do not animate the span's transform or opacity: either would also move or fade
its children. Three small shadows repaint; the other six leaves use `translate`,
`rotate` and opacity animations.

All leaves descend linearly from -12vh to 124vh, with horizontal displacement
of `--forest-wind * 12vw`. Spawn offsets use `left`, separate from rotation.
Leaves are transparent through 8% and after 92% of the fall, reaching full
opacity from 18% to 82%. This keeps resets invisible and off screen.

The theme stylesheet keeps these controls local to the effect:

| Setting | Current behavior |
| --- | --- |
| `--forest-speed` | `0.75`; divides both periods and delays to preserve staggered phases |
| `--forest-period`, `--forest-delay` | Independent clocks for each of the nine leaves |
| `--forest-wind` | Signed horizontal drift; vertical descent stays constant |
| `--forest-offset` | Pseudo-element spawn position relative to its stationary span |
| `--forest-turn` | Pseudo-element rotation direction; full turns loop continuously |
| `--forest-color` | Muted green RGB channels for each shape |

The three silhouettes are the original asymmetric leaf, a narrow pointed leaf,
and a shorter rounded leaf. Their dimensions are 1.2 times the initial sizes.
Peak opacity is 100%; colors are RGB `(29, 77, 51)`, `(35, 72, 39)` and
`(30, 82, 54)`. `prefers-reduced-motion: reduce` hides the entire layer and stops
its animations. Other theme IDs never activate these rules.

## Validation

See `VALIDATION.md` for the migration's historical evidence, limitations, file
inventory, and the later ambient-leaf validation. The temporary Python/Playwright
validation harness has been removed. Remaining source-level checks are:

```sh
node --check web/components/theme.js
git diff --check
```
