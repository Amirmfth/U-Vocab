# U-Vocab Design System

This document records the design language already present in U-Vocab so future UI work can evolve the product without inventing a new visual system per feature.

It is extracted from the current `main` branch, primarily `src/app/globals.css`, `src/app/core-experience.css`, the application shell, navigation, and the core Home / Words / Review / Practice surfaces.

## Product design direction

U-Vocab is a focused German-learning workspace rather than a gamified consumer toy or an analytics dashboard.

The interface should feel:

- calm during study and recall
- compact and information-dense without becoming cramped
- dark, focused, and high-contrast
- restrained in decoration
- expressive mainly around progress, feedback, and learning state
- optimized for repeated daily use on mobile
- equally usable with keyboard on desktop

Avoid turning every feature into an isolated visual concept. New work should reuse the primitives and hierarchy below.

## Color system

The application is dark-only today.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#09090b` | App background |
| `--surface` | `#111114` | Primary panels/cards |
| `--surface-raised` | `#17171b` | Raised controls and secondary surfaces |
| `--surface-soft` | `#1d1d22` | Inset/answer/quiet surfaces |
| `--border` | `#2a2a31` | Default dividers and outlines |
| `--border-strong` | `#3b3b46` | Emphasized boundaries |
| `--text` | `#f5f5f7` | Primary content |
| `--text-soft` | `#b4b4bf` | Supporting content |
| `--text-muted` | `#7f7f8d` | Metadata and tertiary labels |
| `--primary` | `#8b7cff` | Brand/action accent |
| `--primary-strong` | `#a79dff` | High-contrast accent |
| `--primary-soft` | `rgba(139, 124, 255, 0.12)` | Selected/active surfaces |
| `--success` | `#49c98b` | Positive learning state |
| `--danger` | `#ff6b7a` | Error / incorrect / destructive state |
| `--warning` | `#f0b35b` | Warning state |

Purple is the only brand accent. Green, red, and amber are semantic colors and should not be reused decoratively.

## Typography

Primary interface typeface: Geist Sans.

Precision/metric typeface: Geist Mono.

Current hierarchy:

- hero/page title: fluid, approximately `2.25rem–4.8rem`, tight tracking
- learning prompt: approximately `1.35rem–2rem`
- section heading: approximately `1.1rem`
- body/supporting text: approximately `0.86rem–0.98rem`
- metadata/eyebrows: approximately `0.66rem–0.76rem`
- numeric metrics: Geist Mono with tabular numerals

Use large display typography sparingly. Study surfaces should prioritize prompt readability over decorative scale.

## Spacing

Core spacing scale:

| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |

Prefer this scale for new core UI. Existing legacy rules may use values outside it; do not expand the scale without a recurring need.

Page-level vertical rhythm is generally 16–24px. Dense internal UI commonly uses 6–12px.

## Radius and elevation

| Token | Value |
| --- | --- |
| `--radius-sm` | 12px |
| `--radius-md` | 16px |
| `--radius-lg` | 22px |
| `--radius-xl` | 28px |
| `--shadow` | `0 18px 50px rgba(0,0,0,.26)` |

Use:

- 12–14px for compact controls
- 16px for nested panels/disclosures
- 22px for standard cards/panels
- 28px only for large/modal surfaces

Elevation is intentionally limited. Prefer border and surface changes before adding shadows.

## Interaction sizing

- minimum core touch target: `44px`
- standard form control/button height: `48px`
- important mobile CTAs often use `50–54px`
- mobile navigation items are approximately `52px` tall

Do not introduce sub-44px primary interactive controls on phone.

## Focus

Core focus ring:

`--focus-ring: 0 0 0 3px rgba(139, 124, 255, 0.22)`

The core layer also provides a visible `:focus-visible` outline for links, buttons, inputs, textareas, selects, and summaries.

New controls must preserve a visible keyboard focus state.

## Surfaces

### Panel/card

Standard card/panel treatment:

- `1px` border using `--border`
- `--surface` base
- subtle top highlight / low-contrast gradient
- `--radius-lg`
- restrained inset highlight rather than large drop shadow

Cards should not all become visually elevated. Use flat rows and dividers for scan-heavy lists.

### Forms

Inputs/textareas/selects:

- `48px` minimum height
- dark inset background
- `14px` radius
- border emphasis + purple focus treatment
- explicit labels for all user-editable controls

### Badges

Badges are compact metadata, not primary actions.

- pill radius
- raised surface
- border
- Geist Mono
- ~0.67rem text

Avoid badge overload on scanning-heavy screens.

## Buttons

### Primary

Primary actions currently use light text-colored surfaces against the dark app rather than purple-filled buttons.

Use for the dominant action on a surface.

### Secondary

Raised dark surface with border.

Use for alternate actions.

### Success / danger

Reserved for semantically positive or negative outcomes/actions.

Do not use semantic colors merely to add variety.

## Navigation

Primary learning architecture:

1. Home
2. Words
3. Review
4. Practice

Desktop:

- fixed 242px sidebar
- learning destinations grouped separately from account/system actions
- semantic section ownership controls active states

Mobile:

- fixed top header
- four-item bottom navigation
- Add Word and Settings live in the header
- bottom navigation respects safe-area insets

Secondary routes use the section-context breadcrumb/trail rather than becoming primary destinations.

## Responsive system

Canonical core breakpoints:

- base: narrow-phone-first
- `620px`: small/tablet enhancement
- `940px`: desktop shell

The legacy stylesheet contains additional historical breakpoints. New core work should default to 620/940 unless a component has a demonstrated content-driven need.

### Mobile principles

At ~320–430px:

- one dominant action per learning state
- progressive disclosure over large tool grids
- scan-heavy lists use rows, not card collections
- sticky learning controls must sit above bottom navigation
- safe-area insets must be respected
- horizontal scrolling is limited to deliberate chip/filter rows

## Core component patterns

### Learning card

Used for review/practice sessions.

Structure:

1. compact metadata/status
2. large prompt
3. optional hint/disclosure
4. answer/feedback region
5. dominant next/rating controls

Keep the prompt as the strongest element.

### Vocabulary row

Optimized for scanning.

Contains:

- lemma/article
- first translation
- learner-state signal
- due/weak status
- mastery percentage + thin progress line

Full metadata belongs on detail screens.

### Status notice

Three primary tones:

- success
- error
- information

Use a textual state label/message in addition to color.

### Metric/progress bar

Thin, quiet track. Purple is the default progress accent.

### Disclosure

Use native `details/summary` where the content is secondary and can be progressively disclosed.

## Motion

Current motion principles:

- short ~150–180ms interaction transitions
- transform/opacity for movement
- subtle press scaling
- small card lift on desktop hover
- Framer Motion only where a real spatial transition helps (for example mobile sheet)
- global reduced-motion support is mandatory

Motion should communicate state/continuity. Do not animate routine content merely for decoration.

## Content hierarchy

U-Vocab currently follows a useful learning hierarchy:

- Home answers “what should I do next?”
- Words supports finding/understanding vocabulary
- Review supports retention and repair
- Practice supports applying vocabulary through skills

When adding a feature, place it under this architecture instead of adding another primary destination.

## Accessibility contract

New UI must preserve:

- semantic buttons for actions and links for navigation
- visible `:focus-visible`
- minimum 44px touch targets
- explicit form labels
- text alternatives/labels for icon-only controls
- safe-area handling
- reduced-motion support
- keyboard-operable learning flows
- text labels in addition to color state

## Anti-drift rules

Do not:

- add new brand accent colors without changing this document
- introduce a second global radius/spacing system
- use giant dashboard cards for scan-heavy vocabulary data
- put every metadata field on list rows
- turn all buttons purple
- add a primary navigation destination without changing the information architecture
- hide required actions behind hover
- use motion that becomes part of task completion
- ship new UI that only works visually at desktop width

## Source of truth

For future UI work:

1. this document defines the product-level visual contract
2. `docs/information-architecture.md` defines feature ownership
3. `docs/mobile-core-experience.md` defines core mobile behavior
4. CSS tokens in `globals.css` / `core-experience.css` implement the system

If code and this document disagree, determine whether the code is a deliberate exception or design drift before copying it into new UI.
