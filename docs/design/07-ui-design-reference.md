# LinkPulse UI Design Reference

> **DESIGN PACK | 07 | VISUAL FOUNDATIONS AND PRODUCT UI**

## Contents

- [Design source](#design-source)
- [Visual foundations](#visual-foundations)
- [Layout and typography](#layout-and-typography)
- [Components and states](#components-and-states)
- [Product areas](#product-areas)
- [Assets and accessibility](#assets-and-accessibility)

## Design source

The Figma file contains a foundations board, not finished screens for the dashboard or product workflows. Use it as a visual reference for the palette, type, and component treatments; base page behavior and content on the implemented application.

- **Figma file:** [LinkPulse Product Design](https://www.figma.com/design/KBrKYr6s84ZDaEG3ClHUF6/LinkPulse-%E2%80%94-Product-Design?node-id=0-1&p=f)
- **Frame:** `9:632` — Foundations / Tokens and components
- **Local export:** [Foundations board](assets/figma-foundations.png)

## Visual foundations

| Token | Value | Use |
|---|---|---|
| Canvas | `#F4F1EC` | Warm app background |
| Navy | `#04213F` | Navigation and deep surfaces |
| Cream | `#FFFDF8` | Cards, forms, and elevated surfaces |
| Sand | `#EDE9E3` | Secondary controls and dividers |
| Blue | `#0F5BE6` | Primary actions and selected states |
| Orange | `#F26B0F` | Attention and secondary emphasis |
| Ink | `#092844` | Main text and headings |
| Muted | `#5F6B75` | Supporting text and subdued borders |
| Green | `#206649` | Success and active states |
| Red | `#AD3534` | Error, expired, and destructive states |
| Active tint | `#E4EFE5` | Active-state background |
| Expired tint | `#FBE8D5` | Expired-state background |

Prefer calm neutral surfaces, clear hierarchy, restrained shadows, and semantic state colors. Avoid gradients, glass effects, and decorative accents that compete with analytics or link controls.

## Layout and typography

- Use Plus Jakarta Sans with a sans-serif fallback.
- Follow an 8 px spacing rhythm and approximately 145% body line height.
- Reference desktop proportions are a 1440 px canvas, 216 px navigation rail, 40 px page gutters, and 24 px content gaps. Adapt these fluidly for smaller screens.
- Use compact, confident headings: 32–48 px for page titles, 18–24 px for section headings, 14–16 px for body text, and 12–14 px for metadata.
- Cards use generous spacing and approximately 24 px corner radii. Buttons and inputs use roughly 10 px radii; status chips use roughly 7 px.
- Inputs are about 48 px high where practical, with visible focus and explicit validation states.

## Components and states

| Component/state | Treatment |
|---|---|
| Primary action | Blue fill with white label |
| Secondary action | Sand fill with ink label |
| Outline action | Cream fill, muted border, ink label |
| Active status | Active tint with green text/icon |
| Disabled status | Sand fill with muted text |
| Expired status | Expired tint with red text/icon |
| Focus | Clearly visible, high-contrast keyboard ring |
| Loading, empty, and error | Explicit, readable state with a useful next step where applicable |

Keep icon size and stroke consistent. Respect reduced-motion preferences and include hover, pressed, disabled, and loading states.

## Product areas

Apply the shared visual system to the existing product flows while preserving their content and behavior:

| Area | UI focus |
|---|---|
| Authenticated shell | Clear navigation, active route, account controls, and responsive mobile navigation. |
| Dashboard | Page title, range control, existing KPIs, traffic chart, and summaries in a readable hierarchy. |
| Links | Search, filters, sorting, create action, scannable list/table, selection, bulk actions, and visible validation. |
| Campaigns | Campaign state, create/edit/archive controls, link assignment, and detail comparisons. |
| Analytics | Clear filter placement, legible chart labels/legends/tooltips, geography, and alerts. |
| QR codes | Link selection, preview, customization, and local PNG/SVG download. |
| CSV import | Input guidance, column mapping, row outcomes, summary counts, and error-report download. |
| Administration | Platform link controls and domain blocklist, with explicit destructive action feedback. |
| Public flows | Consistent login, signup, continue, unlock, and status pages with accessible forms and recovery actions. |

## Assets and accessibility

The supplied foundations board does not include product illustrations or image assets. The repository contains design screenshots and the foundations export; treat them as references and do not describe them as runtime product screenshots. Use real charts and product data as the primary visual content. Any additional illustration should clarify a real empty/help state and remain secondary to its action and text.

Preserve route paths, API contracts, permissions, validation, and real loading/error/empty states. Use semantic HTML, associated labels, keyboard operation, visible focus, sufficient contrast, and responsive layouts without mobile horizontal overflow. Do not substitute mock data or remove functionality to simplify the presentation.
