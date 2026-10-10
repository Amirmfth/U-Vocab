# U-Vocab Tailwind styling

The application's page/component styles have been migrated from global semantic CSS to Tailwind CSS 4 utilities. This is an implementation migration, not a redesign.

## Where styles live

- `className` in TSX owns component and page styling.
- `src/app/globals.css` owns Tailwind imports, shared `@theme` color tokens, document/browser primitives, keyframes, and reduced-motion behavior.
- `src/i18n/fonts.css` retains IRANYekan font-face declarations and RTL typography semantics.
- `postcss.config.mjs` configures Tailwind's PostCSS plugin.

The old app-wide `core-experience.css`, `core-learning-polish.css`, and `grammar.css` declarations were migrated into TSX and removed.

## Theme tokens

Use Tailwind theme colors rather than scattering new literals:

- `bg-uv-bg`, `bg-uv-surface`, `bg-uv-surface-raised`, `bg-uv-surface-soft`
- `border-uv-border`, `border-uv-border-strong`
- `text-uv-text`, `text-uv-text-soft`, `text-uv-text-muted`
- `text-uv-primary`, `text-uv-primary-strong`
- `text-uv-success`, `text-uv-danger`, `text-uv-warning`

Prefer idiomatic utilities such as `flex`, `grid`, `gap-3`, `rounded-xl`, `transition-colors`, and state prefixes when adjusting styling going forward.

## Existing pixel-specific styles

The automated migration intentionally preserved exact declarations using arbitrary-property utilities such as `[gap:14px]`, `[border-radius:13px]`, and selector-scoped variants. They encode the previous visual output rather than introducing a new spacing scale.

You can gradually replace these with standard Tailwind utilities **only when** a resulting visual difference is acceptable. Some variants include original semantic class selectors or descendants; preserve those hooks until the related elements are refactored together.

## Responsive, RTL, motion, and safe areas

The existing responsive design uses exact breakpoints including 620px, 700px, and 940px rather than replacing them with Tailwind's default breakpoints. Migrated variants use values such as `min-[620px]:` and `min-[940px]:`.

Preserve:
- mobile header and bottom safe-area insets;
- the 940px sidebar transition;
- reduced-motion preferences;
- Persian RTL text alignment and IRANYekan;
- focus-visible, pressed, selected and disabled states;
- named spinner, shimmer, and sheet animations.

## Visual parity QA before merge

Passing the TypeScript/lint/build pipeline does not prove the rendered UI is identical. Compare these pages and states on the original `main` and this branch:

1. Mobile at 360px/390px and desktop at 1024px/1440px;
2. English and Persian RTL interface;
3. Dashboard, navigation, add-word sheet, vocabulary list and word details;
4. Review answer reveal/grades, practice states, writing editor, reading text;
5. Conversation, grammar lesson/teach sheet, topic packs, settings and auth;
6. Focus, hover, active, disabled, selected, loading, and reduced-motion behaviors.

Treat any layout or behavior differences as migration regressions, not intentional design changes.

## Migration implementation

`scripts/migrate-tailwind-ui.mjs` documents the one-time selector/declaration conversion. It is not intended as an everyday design authoring mechanism; make new changes directly to TSX classes and theme tokens.
