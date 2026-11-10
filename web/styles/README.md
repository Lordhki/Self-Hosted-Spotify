# CSS and theme architecture

This is a migration of the existing listening room, with the original breakpoints,
artwork and video behavior. There is no build step or styling framework.

## Ownership and cascade

`main_menu.html` loads `styles/style.css`, then `styles/background-legacy.css`.
The entry point imports these shared files in order:

| File | Owns |
| --- | --- |
| `tokens.css` | Shared geometry/typography scales and a complete neutral fallback palette |
| `layout.css` | Page reset, app/sidebar/main/playback structure, display panels and UI stacking contexts |
| `components.css` | Component geometry, states and token-based appearance |
| `responsive.css` | Existing viewport overrides, in their original order, and reduced-motion rules |

Core styles never select a theme ID. Component geometry stays with its component;
application regions and stacking contexts stay in layout. Responsive rules run
last, preserving width breakpoints at 1120, 960, 768 and 400px and the short-screen
query at height <=720px / width >=769px. No cascade layers were added, avoiding a
change to the existing specificity model.

Each `themes/<id>/ui.css` sets only public appearance properties under
`:root[data-theme="<id>"]`. It contains no layout rules, media queries or artwork
URLs. All three existing palettes explicitly supply the complete appearance
contract. Optional properties in future themes inherit neutral defaults rather
than values from a previously active theme.

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
registry maps IDs to labels, metadata colors, UI stylesheet paths and existing
wallpaper sources/rates. URLs resolve against the script URL so serving either
the repository or `web/` directly works.

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
2. Add one registry entry in `components/theme.js` with a unique `id`, `label`,
   `color`, `stylesheet`, and wallpaper `src`/`playbackRate`. Existing wallpaper
   configuration remains explicit; no framework or generated manifest is needed.
3. Test switching, reload, failed loads, and the existing viewports. No shared CSS
   changes are needed for an ordinary UI palette. Add an appearance token with a
   neutral default, or a reusable component variant, for a new component need.

Custom background artwork is a separate concern: this phase deliberately keeps
existing exceptional implementations in `background-legacy.css`, rather than
requiring every new theme to use the Magic Forest implementation.

## Legacy background dependencies reserved for the next phase

- `body.listening-page` creates an isolated page context. Its fixed `::before`
  artwork occupies z-index 0 for Starlight/Quiet. Starlight uses a transparent
  app surface and translucent navy sidebar/main/playback surfaces so its SVG
  remains visible; raised controls and lyric/video panels retain their contrast.
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
  `--sidebar-artwork-opacity` are **legacy-only** variables. Their per-theme
  values and URLs live in `background-legacy.css`, outside the UI contract.
- Original assets remain at `assets/theme/Starlight.svg` and
  `assets/theme/MagicForest.jpg`. CSS URLs gained `../` only to account for the
  stylesheet's new directory. Magic Forest's sidebar uses the original
  `background-size: 100vw 100vh`, including its existing mobile/scroll behavior.
- `.wallpaper-layer` and its cover-sized video keep the original geometry. One
  persistent muted, looping, inline video switches sources without replacing the
  element. Starlight uses `starlight/6.mp4` at **0.1**, Quiet `quiet/1.mp4` at
  **0.5**, and Magic Forest `magic-forest/1.mp4` at **0.1** under
  `assets/wallpaper/`. Visibility changes pause/resume that same video.
- `.ambient-effects` and its meteor spans currently have no matching CSS. Their
  markup is preserved, as are dormant component states and background helpers;
  they were not assumed obsolete merely because the sample page doesn't use them.

The redundant Magic Forest `.app` z-index override, duplicate mobile sidebar
width/implicit stretch, overwritten artwork declaration, duplicated section
heading and repeated base flex-alignment declarations were removed. The invalid
Magic Forest `color: var(--color-page)` (a gradient in a color property) simply
inherited text color; shared inheritance now preserves that effective result.
No artwork system, iframe or additional animation was introduced.

## Validation

See `VALIDATION.md` for this migration's evidence, limitations and file inventory.
Optional development checks require Python, Chromium and `tests/requirements.txt`:

```sh
python3 -m venv work/venv
work/venv/bin/pip install -r tests/requirements.txt
# Use an installed Chromium, or: work/venv/bin/playwright install chromium
work/venv/bin/python -m unittest discover -s tests -v
node --check web/components/theme.js
```

Set `CHROMIUM_EXECUTABLE` if Chromium is installed under another name/path.
Browser tests start their own local server and use the existing system-font
fallback for deterministic offline checks. These packages are development tools,
not runtime dependencies or a new build system.
