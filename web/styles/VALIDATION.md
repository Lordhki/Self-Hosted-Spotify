# CSS migration validation

Validated on 2026-11-10 against the original checkout at `1114e92`, using local
Python HTTP servers and Chromium with Playwright. Backend files and artwork/video
assets were unchanged.

## Results

- **11 automated tests passed:** four CSS architecture/parser checks and seven
  browser integration checks. `node --check web/components/theme.js` and
  `git diff --check` also passed.
- CSS checks parse every stylesheet, resolve every local import/image URL, verify
  the original media-query sequence, prohibit theme IDs in shared core CSS and
  prohibit structural properties in UI palettes. Existing palettes have the same
  complete public appearance-token set.
- Browser checks cover all three labels, next-theme accessibility text,
  theme-color metadata, localStorage persistence after reload, wraparound cycling,
  single-video identity, source paths and configured playback rates, video readiness
  and playback, visibility pause/resume, track selection and metadata, slider fills
  and both display-mode radios.
- Delayed loads preserve the old palette/metadata/wallpaper. Rapid clicks cancel
  stale loads; returning to the active theme does not fetch its stylesheet again.
  HTTP 404, network failure, the actual five-second timeout, initial fallback,
  failure of every palette, later recovery and denied localStorage were exercised.
  A requestAnimationFrame probe confirmed that a delayed saved Quiet palette did
  not reveal a Starlight or unstyled body first; a fast palette paired with a
  delayed app module also stayed hidden until the saved label was initialized.
- Responsive geometry and control hit testing passed at **1440x900, 1120x800,
  960x800, 1366x720, 769x720, 768x900, 390x844 and 320x700**, for every theme.
  Region geometry stays identical between themes; no document horizontal overflow
  was introduced. Theme, play and timeline controls receive pointer hits rather
  than being covered by artwork.
- Before/after computed-style comparisons covered all **24 theme/viewport
  combinations**, including element/pseudo-element geometry, surfaces, typography,
  clipping and stacking. After normalizing server URLs, the only differences were
  the intentional shared sidebar `position: relative` / `isolation: isolate` and
  removal of Magic Forest's redundant mobile `align-self: stretch` (the parent
  already stretches it). No unexpected computed-style differences remained.
- Desktop and mobile screenshots were compared and visually inspected for all
  three themes. Separate comparisons covered the original empty lyrics panel and
  selected-track controls with wallpaper videos paused at the same one-second
  frame. The latter matched exactly in three cases and differed by at most three
  pixels, by one RGB level, in the other cases. Empty-panel comparisons differed
  by at most 32 pixels out of 342,810 mobile pixels or 9 out of 1,296,000 desktop
  pixels; region geometry and computed appearance matched. Hover colors, SVG
  strokes, raised playlist surfaces and the paused play triangle also matched.

Both repository-root `/web/main_menu.html` serving and a server rooted directly
at `web/` were exercised. Local CSS, script, artwork and configured video paths
loaded successfully. No unexpected application JavaScript exceptions or new
local-resource/console errors occurred in the functional checks.

## Environment notes and limits

- The cloud Chromium instance rejected the existing remote Google Fonts proxy
  certificate. Functional tests supply an empty external font stylesheet and use
  the existing system-font fallback, so those tests work offline. For visual
  comparisons, the original Google font stylesheet and Inter font files were
  downloaded using Python's system CA trust with TLS verification enabled, then
  supplied unchanged at their original URLs through browser request routing.
  Inter was confirmed loaded. The application font import was not changed.
- Existing sample references to `assets/artwork/example.jpg` and
  `assets/artwork/another.jpg` still return 404; those files are absent in the
  original repository. Their broken-image placeholders were preserved and
  excluded from new-error assertions. A missing favicon is likewise pre-existing.
  Intentional failed-stylesheet tests produce expected network errors/warnings.
- The prototype's lyrics panel is empty and audio, queue, shuffle, repeat, seeking,
  volume integration and several toolbar actions are not implemented upstream.
  The existing implemented presentation/selection interactions were tested; real
  audio playback and populated live lyrics could not be verified.
- Chromium desktop/mobile viewport emulation was used. Firefox, Safari, physical
  phones and browser-specific autoplay policies were not tested. Mozilla slider
  rules, existing viewport fallbacks and reduced-motion rules were retained.

## Architecture trade-offs

The public appearance contract and theme-loading flow are documented in
`README.md` beside this file. Native CSS imports add small local stylesheet
requests and avoid introducing a build pipeline. Initial palette loading briefly
holds body visibility; complete fallbacks and per-request timeouts bound failure
recovery. A failed switch keeps the current theme and logs a warning rather than
adding a new error UI during an architectural refactor.

Artwork rendering remains intentionally exceptional in `background-legacy.css`:
the body artwork plane, Magic Forest's separate image/overlay planes and sidebar
pseudo-element, legacy artwork variables, wallpaper cropping and dormant helpers
remain there. The UI layout owns the page/app/sidebar/panel stacking contexts.
Magic Forest's transparent region surfaces still expose that legacy artwork.
Adding a normal UI theme requires only a palette and registry entry; a different
static-artwork implementation remains a separate background-phase concern.

## File inventory

Created:

- `web/styles/style.css`
- `web/styles/tokens.css`
- `web/styles/layout.css`
- `web/styles/components.css`
- `web/styles/responsive.css`
- `web/styles/background-legacy.css`
- `web/styles/README.md`
- `web/styles/VALIDATION.md`
- `web/themes/starlight/ui.css`
- `web/themes/quiet/ui.css`
- `web/themes/magic-forest/ui.css`
- `tests/test_css_architecture.py`
- `tests/test_theme_browser.py`
- `tests/requirements.txt` (optional development tools only)

Modified:

- `web/main_menu.html`: new stylesheet links, early theme initialization and
  token-based SVG strokes with the original effective colors.
- `web/components/theme.js`: resource registry, staged stylesheet loading,
  authoritative active state and existing video lifecycle.
- `README.md`: current styling structure and validation pointers.
- `.gitignore`: local validation environment and Python cache exclusions.

Removed:

- `web/style.css`: migrated into the files above; no remaining page references.

`app.js`, `player.js`, `track.js`, backend sources, existing class/element
interfaces, background markup and all media assets remain unchanged.

## Follow-up: Starlight artwork visibility

The appearance-preservation baseline above included an upstream bug: Starlight's
opaque application surfaces concealed its SVG. Browser inspection confirmed HTTP
200 / `image/svg+xml`, a valid 1440x960 SVG with stars and ambient artwork, and the
correct body pseudo-element below `.app`. The opaque app, sidebar, main and
playback backgrounds—not a missing resource or broken z-index—hid that plane.

Starlight's palette now makes the app surface transparent and applies the same
navy RGB color to the sidebar (55% opacity), main (20%) and playback (60%). Raised
controls, borders, typography, lyric/video panels and all layout/stacking rules
remain unchanged. No other theme palette or background implementation changed.

Chromium screenshots at 1440x960 and 390x844 were inspected with the SVG visible
through the layout and controls readable above it. All 11 automated checks passed,
including three-theme switching and eight-viewport geometry/control hit testing.
This intentional visibility correction supersedes Starlight's earlier screenshot
baseline; that broken appearance is not the target. Cross-browser/physical-device
and existing sample-artwork limitations described above still apply.
