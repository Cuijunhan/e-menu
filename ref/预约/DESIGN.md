# Design System Strategy: The Curated Stillness

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** Unlike standard WeChat Mini Programs that compete for attention with high-saturation banners and dense grids, this system functions as a high-end editorial gallery. It prioritizes the "luxury of space."

To break the "template" look, we move away from centered, symmetrical layouts. Instead, we use **intentional asymmetry**—offsetting headings to the left while maintaining generous 16 (5.5rem) or 20 (7rem) spacing units at the top of screens. This creates a rhythm that feels more like a physical art book than a mobile app. The "Zen" quality is achieved not through emptiness, but through the precise placement of delicate elements against vast, breathable white fields.

---

## 2. Colors
The palette is a sophisticated study in tonal neutrals, designed to feel light yet grounded.

*   **Primary Foundation:** `background` (#f9f9f9) and `surface_container_lowest` (#ffffff) provide the base. 
*   **The Accent:** `primary` (#5f5e5e) acts as our "soft charcoal." It is used sparingly for key CTAs and active states to maintain the calm.
*   **The "No-Line" Rule:** 1px solid borders for sectioning are strictly prohibited. You must define boundaries through background shifts. For example, a card should be `surface_container_lowest` (#ffffff) sitting on a `surface` (#f9f9f9) background.
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of fine paper. 
    *   Level 0: `surface` (Base)
    *   Level 1: `surface_container_low` (Subtle grouping)
    *   Level 2: `surface_container_lowest` (Highlighted content/Cards)
*   **Glass & Gradient Rule:** For floating navigation or modals, use `surface_container_lowest` with 85% opacity and a `backdrop-blur` of 20px. Main CTAs should use a subtle vertical gradient from `primary` (#5f5e5e) to `primary_dim` (#535252) to add a tactile, premium depth.

---

## 3. Typography
The typographic soul of the system lies in the high-contrast pairing of an elegant Serif and a technical Sans-Serif.

*   **Display & Headline (Noto Serif):** These are the "Art Directors" of the screen. Use `display-lg` (3.5rem) for hero moments with tight letter-spacing (-0.02em) to evoke high-fashion editorial.
*   **Title & Body (Manrope):** The "Curator." These Sans-Serif tokens provide clarity and modernism. Manrope’s geometric but warm terminals ensure readability in the WeChat environment.
*   **Hierarchy Note:** Always leave a minimum of `spacing-8` (2.75rem) between a `headline-lg` and `body-md` to ensure the "Zen" negative space is maintained.

---

## 4. Elevation & Depth
We reject heavy, muddy drop shadows. Depth is an atmosphere, not a structure.

*   **Tonal Layering:** Most hierarchy is achieved by placing a "Bright" surface on a "Dim" surface. Use `surface_bright` (#f9f9f9) on top of `surface_dim` (#d3dbdd) for high-importance interactions.
*   **Ambient Shadows:** If an element must float (like a bottom-sheet action), use a shadow color of `on_surface` (#2d3435) at 4% opacity with a 40px blur. It should feel like a soft glow rather than a shadow.
*   **The Ghost Border:** If accessibility requires a container edge, use `outline_variant` (#acb3b4) at 15% opacity. It should be barely perceptible—visible only when looked for.
*   **Glassmorphism:** Use semi-transparent layers for top navigation bars to allow the "Zen" backgrounds to bleed through, maintaining a sense of continuity.

---

## 5. Components

### Buttons
*   **Primary:** Background `primary` (#5f5e5e), text `on_primary` (#faf7f6). Use `roundedness-full` (9999px) for a soft, pebble-like feel.
*   **Secondary:** Background `transparent`, "Ghost Border" at 20% opacity, text `primary`.
*   **Tertiary:** No background, `label-md` typography, underline using `outline_variant` (#acb3b4) with a 2px offset.

### Input Fields
*   **Style:** Minimalist underline only. Use `outline` (#757c7d) at 30% opacity for the default state. 
*   **Active:** Transitions to `primary` (#5f5e5e) at 100% opacity. 
*   **Error:** Uses `error` (#9f403d) for the underline and `body-sm` for helper text.

### Cards & Lists
*   **Forbidden:** Divider lines. 
*   **Implementation:** Separate list items using `spacing-4` (1.4rem). Group related items within a `surface_container_low` (#f2f4f4) wrapper with `roundedness-lg` (0.5rem).

### Selection (Chips & Radios)
*   **Action Chips:** `surface_container_highest` (#dde4e5) with `label-md` text. When selected, shift to `primary` background.
*   **Radio/Checkbox:** Use delicate 1px `outline` circles. When selected, use a small `primary` dot in the center—never fill the entire shape.

---

## 6. Do's and Don'ts

### Do
*   **DO** use asymmetry. Place images off-center and let text wrap into the negative space.
*   **DO** use "The Breathe Test." If you feel the urge to add a divider, add `spacing-6` (2rem) of white space instead.
*   **DO** ensure all icons are "Ultra-Light" weight (1px stroke) to match the elegant serif headers.

### Don't
*   **DON'T** use pure black (#000000). Always use `on_background` (#2d3435) for text to keep the contrast "soft."
*   **DON'T** use `roundedness-none`. Even the most minimal elements need the `sm` (0.125rem) or `md` (0.375rem) corner radius to feel premium and intentional.
*   **DON'T** crowd the WeChat "Capsule" (the top right menu). Ensure your header typography stays at least `spacing-4` away from it to maintain the sophisticated look.