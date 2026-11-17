# Ambient effects: implementation status and remaining plan

Updated 2026-11-17.

## Status

| Theme or layer | Effect | Status |
| --- | --- | --- |
| Shared layout | Fixed, clipped, non-interactive ambient plane below the UI | Complete |
| Magic Forest | Nine independent falling leaves with three silhouettes | Complete and visually accepted |
| Starlight | Shooting stars with diagonal streaks and fading tails | Planned |
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

## Remaining effects

### Starlight: shooting stars

Use the existing ambient layer for thin diagonal streaks, with bright heads and
fading tails in the Starlight palette. Stagger positions, durations and delays.
Keep child paths independent: rotating a moving parent also rotates its child
offsets and can send them in the wrong direction.

### Quiet: floating dust

Use tiny circular motes in the Quiet palette, with slow upward drift and subtle
horizontal movement. Keep opacity low and stagger the individual paths.

For each effect, verify desktop/mobile rendering, theme switching, UI layering,
pointer interaction, loop boundaries, and reduced-motion behavior before marking
it complete. No Starlight or Quiet animation code has been added yet.

## Constraints and implementation notes

- Keep effects CSS-only and reuse the existing three spans.
- Hide the shared layer by default; opt in using theme-scoped selectors.
- Preserve `aria-hidden="true"`, non-interactive layering, and reduced motion.
- Prefer transform and opacity animation. Magic Forest deliberately paints three
  small shadows and animates their border radii so their six child leaves can
  move independently; it does not meet the original transform-only target.
- Use viewport units for full-screen travel, not element-relative percentages.
- Match theme colors, and keep resets invisible beyond viewport boundaries.
