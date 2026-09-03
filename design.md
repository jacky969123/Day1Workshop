# Snip Design Language

A compact, reusable design token set inspired by the look and feel of modern
AI-builder landing pages (dark, minimal, glow-hero, pill-shaped chat input).
This captures *visual language only* — no third-party logos, names, or copy.
Paste this file into any future styling prompt as the source of truth.

## Colors

| Token              | Value                          | Use                                   |
|--------------------|---------------------------------|----------------------------------------|
| `--bg`             | `#0b0b0f`                      | Page background (near-black)          |
| `--surface`        | `rgba(18, 18, 24, 0.9)`         | Cards, inputs, table backgrounds      |
| `--surface-border` | `rgba(255, 255, 255, 0.08)`     | Hairline borders on surfaces          |
| `--text`           | `#f5f6fa`                      | Primary text                          |
| `--text-muted`     | `rgba(230, 232, 240, 0.68)`     | Subline / secondary text              |
| `--text-faint`     | `rgba(230, 232, 240, 0.48)`     | Placeholders, faint labels            |
| `--accent-start`   | `#ff7a59`                      | Gradient warm coral                   |
| `--accent-mid`     | `#ff5d8f`                      | Gradient pink                         |
| `--accent-end`     | `#ff4db8`                      | Gradient magenta                      |
| `--success`        | `#4ade80` / bg `rgba(74,222,128,.12)` | Success notice          |
| `--danger`         | `#f87171` / bg `rgba(248,113,113,.12)` | Error notice            |

## Gradient glow

A fixed, full-viewport-width radial/linear glow band sits behind the hero —
**never** clipped to the centered content column:

```css
.hero-glow {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 480px;
  background: radial-gradient(
    ellipse 60% 100% at 50% 0%,
    rgba(255, 122, 89, 0.55),
    rgba(255, 77, 184, 0.28) 45%,
    rgba(11, 11, 15, 0) 75%
  );
  pointer-events: none;
  z-index: 0;
}
```

Key rule: `position: fixed` + `left/right: 0` + `pointer-events: none`, sized
by `height` not `width`, so it always spans the full browser width regardless
of the max-width content column.

## Typography

- Font stack: `Inter, "Segoe UI", system-ui, sans-serif`
- Type scale:
  - Hero H1: `clamp(2.75rem, 5vw, 4.5rem)`, weight 700, `letter-spacing: -0.04em`
  - Eyebrow / label: `0.78rem`, uppercase, `letter-spacing: 0.16em`, muted
  - Subline: `1.05rem`–`1.15rem`, muted, max-width ~34–40ch
  - Body / table: `0.95rem`–`1rem`

## Spacing & radii

- Spacing scale (px): `4, 8, 12, 16, 20, 24, 32, 48, 64, 96`
- Radii: pill inputs/buttons `999px`; cards/table containers `20–24px`;
  notices `14–16px`
- Generous vertical breathing room: hero top padding `~90px`, section gaps
  `48–64px`

## Surfaces, borders, shadows

- Cards/inputs: `background: var(--surface)`, `border: 1px solid var(--surface-border)`
- Soft elevation: `box-shadow: 0 24px 60px rgba(0,0,0,0.35)` on the chat-style
  input and primary cards only — flat elsewhere
- No hard drop shadows; borders + glow provide separation on the dark bg

## Snip element mapping

| Design language concept        | Snip element                                   |
|---------------------------------|-------------------------------------------------|
| Full-bleed hero glow             | `.hero-glow` behind the page header             |
| Bold centered headline + subline | `.hero` → `<h1>Snip</h1>` + `.subtitle`         |
| Pill chat-style input + attached action | `.shorten-form` (URL `<input>` + `Shorten` button) |
| Inline assistant-style responses | `.notice.success` / `.notice.error`             |
| Rounded card on subtle border    | `.links-card .table-wrap` (and `.empty-state`)  |
| Accent gradient                  | Primary button background, link hover accents   |
