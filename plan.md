# Ambient effects: implementation status and remaining plan

Updated 2026-11-19.

## Status

| Theme or layer | Effect | Status |
| --- | --- | --- |
| Shared layout | Fixed, clipped, non-interactive ambient plane below the UI | Complete |
| Magic Forest | Nine independent falling leaves with three silhouettes | Complete and visually accepted |
| Starlight artwork | Scattered stars, left glow and Leo constellation | Complete and visually accepted |
| Starlight ambient layer | Shooting stars with diagonal streaks and fading tails | Implemented; full browser checks pending |
| Quiet | Small dust motes drifting upward | Planned |

## Completed Magic Forest effect

The existing three `.ambient-effects__meteor` spans each render three leaves:
one animated shadow and two pseudo-elements. The spans remain stationary so
children never inherit another leaf's transform or opacity. All nine clocks
have different periods and negative delays; the staggered motion is deterministic,
not runtime randomness.

Leaves drift sideways while descending at a constant rate. Each path starts at
-12vh and ends at 124vh, with horizontal travel of `--forest-wind * 12vw`.
Rotation is separate from spawn positions and translation. Leaves fade in from
8% to 18%, remain fully opaque through 82%, and fade out by 92%. Resets happen
while invisible and off screen.

Accepted appearance:

- Speed: 0.75 times the original; periods and delays are scaled together.
- Size: 1.2 times the initial dimensions.
- Shapes: asymmetric leaf, narrow pointed leaf, and short rounded leaf.
- Greens: RGB `(29, 77, 51)`, `(35, 72, 39)`, and `(30, 82, 54)`.
- Peak opacity: 100%.
- Reduced motion: hide the layer entirely.

The implementation lives in `web/themes/magic-forest/ui.css`; shared positioning
lives in `web/styles/layout.css`. There are no HTML or JavaScript changes and no
new visual assets. See [CSS architecture](web/styles/README.md) for tuning
controls and [validation](web/styles/VALIDATION.md) for the completed checks.

## Starlight artwork and shooting stars

The accepted artwork lives in `web/themes/starlight/Starlight.svg`:

- Left glow: internal fill opacity increased from 12.5% to 25%.
- All 234 original scattered star points and their source attributes are preserved.
  Reversible SVG style overrides set the smaller points to radius 0.75px at 65%
  opacity and the larger points to radius 1.1px at 72% opacity.
- Leo: a separate editable group with nine stars, thin connecting lines and a
  faint blue glow. Glow opacity is 5% for the lines and 12% for the star halos.
  The group moves up 20 SVG units and rotates 30 degrees counterclockwise around
  its center at `(152.5, 727.5)`; the whole artwork scales with the viewport.

The background URL fix keeps the `background-image` declaration in Starlight's
`ui.css`, alongside the relative SVG URL. A URL stored in a custom property
resolves against the consuming stylesheet; consuming it in shared `layout.css`
incorrectly requested `/web/styles/Starlight.svg`. Shared layout still owns the
artwork plane's geometry. Existing centered `100% auto` sizing remains: wide
viewports crop the top and bottom of the SVG, and some edge glows are clipped
inside the SVG itself.

The Starlight ambient CSS reuses the existing three spans. Each span runs three
sequential diagonal streaks per cycle, with invisible pauses and position resets.
Cycle durations are 36s, 46s and 28s, with negative delays of 2s, 8s and 5s.
The layer is hidden when reduced motion is requested. No HTML or JavaScript
changes or additional assets are required.

Validation: SVG parsing, unique IDs/filter references, preservation of the 234
original star points, UTF-8 encoding and `git diff --check` passed. The user
visually accepted the final artwork. Automated browser checks could not complete
because the local headless browsers failed to launch reliably; desktop/mobile,
theme switching, UI interaction, animation loops and reduced motion still need
the full browser verification described below.

## Remaining effects

### Quiet: floating dust

Use tiny circular motes in the Quiet palette, with slow upward drift and subtle
horizontal movement. Keep opacity low and stagger the individual paths.

For each effect, verify desktop/mobile rendering, theme switching, UI layering,
pointer interaction, loop boundaries, and reduced-motion behavior before marking
it fully verified. Quiet animation code has not been added yet.

## Constraints and implementation notes

- Keep effects CSS-only and reuse the existing three spans.
- Hide the shared layer by default; opt in using theme-scoped selectors.
- Preserve `aria-hidden="true"`, non-interactive layering, and reduced motion.
- Prefer transform and opacity animation. Magic Forest deliberately paints three
  small shadows and animates their border radii so their six child leaves can
  move independently; it does not meet the original transform-only target.
- Use viewport units for full-screen travel, not element-relative percentages.
- Match theme colors, and keep resets invisible beyond viewport boundaries.
