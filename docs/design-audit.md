# U-Vocab UI Critique and Web Interface Guidelines Audit

Scope: current `main` branch.

This is a code-grounded first pass over the application shell and representative core learning flows. No live deployment/browser preview is currently available in the repository context, so visual conclusions that require rendered screenshots remain provisional. Accessibility/interaction findings below are based directly on code.

## Design critique

### What is already working

1. **The information architecture is much clearer than a feature-grid model.**
   Home / Words / Review / Practice creates a stable mental model, while secondary features remain owned by one of those areas.

2. **Mobile is treated as a first-class interface.**
   Bottom navigation, safe-area padding, sticky review controls, compact vocabulary rows, progressive disclosure, and responsive loading geometry are all intentional rather than desktop fallbacks.

3. **Study surfaces are appropriately restrained.**
   Review and practice center the prompt and feedback instead of surrounding them with metrics or decorative cards.

4. **The visual identity is coherent.**
   Dark neutral surfaces + a single purple brand accent + semantic success/error states are consistent across the code reviewed.

5. **The product already has a useful component vocabulary.**
   Panels, learning cards, status notices, badges, metric bars, disclosures, navigation rows, and compact icon actions repeat predictably.

### Main design-system weaknesses

#### 1. The system is implicit rather than governed

Tokens and patterns are split between a very large `globals.css` and `core-experience.css`. That makes copy/paste drift increasingly likely.

**Direction:** treat `docs/design-system.md` as the product contract and migrate reusable primitives toward explicit shared components/tokens over time. Do not perform a large rewrite solely for purity.

#### 2. Breakpoint drift exists

Core behavior is intentionally based on 620px and 940px, but legacy CSS contains additional 700/760/900/1040 breakpoints.

**Direction:** new UI should default to 620/940. Existing special breakpoints should remain until the owning component is revisited.

#### 3. Primitive styling and feature styling are too interleaved

`globals.css` contains both foundation primitives and a large amount of feature-specific styling. This raises the cost of understanding whether a rule is canonical or historical.

**Direction:** when a feature receives substantial UI work, move its rules into a colocated/module or dedicated feature stylesheet while leaving stable shared primitives global.

#### 4. Some form surfaces rely on placeholder text as the only visible prompt

This is both an accessibility issue and a hierarchy issue. The Writing editor and Add Vocabulary text input are the clearest examples.

**Direction:** visible compact labels should remain present even when the field itself is visually dominant.

#### 5. Modal/sheet behavior is visually implemented more fully than interaction semantics

The mobile add sheet handles Escape and body scroll locking, but it does not currently show focus trapping, initial focus placement, or focus restoration.

**Direction:** make the sheet a complete dialog pattern, not just a visual bottom sheet.

## Web Interface Guidelines findings

The current audit uses the latest Vercel Web Interface Guidelines fetched for this review.

### src/app/layout.tsx

- `src/app/layout.tsx:22-31` — no skip link to the primary content; add a keyboard-visible “Skip to content” target.
- `src/app/layout.tsx:12-15` — no theme-color metadata matching the dark application background.
- `src/app/layout.tsx:27-29` — application content wrapper is a `div`; ensure each route has a semantic `main` and the skip-link target resolves consistently.

### src/app/writing/[id]/WritingEditor.tsx

- `src/app/writing/[id]/WritingEditor.tsx:37-43` — textarea has no `<label>` or `aria-label`.
- `src/app/writing/[id]/WritingEditor.tsx:37-43` — non-auth text field should explicitly set appropriate autocomplete behavior.
- `src/app/writing/[id]/WritingEditor.tsx:47` — approximate target count uses a raw `~`; consider clearer copy such as “47 / about 120 words” for screen-reader clarity.

### src/app/vocabulary/new/AddLexemeForm.tsx

- `src/app/vocabulary/new/AddLexemeForm.tsx:39-45` — textarea has no `<label>` or `aria-label`.
- `src/app/vocabulary/new/AddLexemeForm.tsx:39-45` — non-auth text field should explicitly set appropriate autocomplete behavior.

### src/app/read/ReadingForm.tsx

- `src/app/read/ReadingForm.tsx:22` — title input should set explicit autocomplete behavior.
- `src/app/read/ReadingForm.tsx:27-33` — reading textarea should set explicit autocomplete behavior.

### src/app/login/LoginForm.tsx

- `src/app/login/LoginForm.tsx:22` — `autoFocus` is unconditional; guidelines recommend avoiding automatic focus on mobile. Restrict it to an intentional desktop behavior or remove it.
- `src/app/login/LoginForm.tsx:22-23` — labels/autocomplete are otherwise correctly present.

### src/components/mobile-add-vocabulary-sheet.tsx

- `src/components/mobile-add-vocabulary-sheet.tsx:40-69` — dialog lacks an explicit focus trap and focus restoration to the trigger.
- `src/components/mobile-add-vocabulary-sheet.tsx:51-69` — scrolling panel should explicitly use `overscroll-behavior: contain` so scroll does not chain into the page behind it.
- `src/components/mobile-add-vocabulary-sheet.tsx:40` — dialog semantics are present (`role=dialog`, `aria-modal`, labelled title), which is good.

### src/components/app-navigation.tsx

- `src/components/app-navigation.tsx:95-110` — icon-only header controls are correctly labelled.
- `src/components/app-navigation.tsx:120` and `:175` — navigation landmarks have labels and active state uses `aria-current`; keep this pattern.
- `src/components/app-navigation.tsx:89-191` — fixed top/bottom navigation means skip/focus behavior should be tested to ensure focused content is never obscured.

### src/app/review/ReviewCard.tsx

- `src/app/review/ReviewCard.tsx:25-40` — keyboard shortcuts are implemented and have button alternatives.
- `src/app/review/ReviewCard.tsx:63` — shortcut instruction is visible, which is good.
- `src/app/review/ReviewCard.tsx:54-78` — all primary actions are native buttons.

### src/app/core-experience.css

- `src/app/core-experience.css:19-22` — global `:focus-visible` treatment is present; preserve it.
- `src/app/core-experience.css:853-862` — mobile filter overlay has constrained scrolling but should also use `overscroll-behavior: contain`.
- `src/app/core-experience.css:608-618` and `:746-755` — sticky review/writing controls deliberately account for the bottom navigation/safe area; verify keyboard focus is not covered at 320–430px.

### src/app/globals.css

- `src/app/globals.css:1-3` — dark color scheme is declared, though applying `color-scheme: dark` on `html` rather than only `:root` would align more literally with the guideline.
- `src/app/globals.css:426-430` — focus replacement exists for form inputs despite `outline: none`, so this is not an unmitigated outline-removal issue.
- global reduced-motion rules are present; retain them for every future animation.

## Priority order

### P0 — accessibility/interaction correctness

1. Add labels to Writing and Add Vocabulary textareas.
2. Add skip-link infrastructure.
3. Complete mobile sheet focus trap/restoration and scroll containment.
4. Remove or constrain unconditional login `autoFocus`.

### P1 — system consistency

1. Adopt `docs/design-system.md` as the UI source of truth.
2. Use canonical 620/940 responsive targets for new core UI.
3. Start separating shared primitives from feature-specific CSS as touched.

### P2 — visual critique after rendered preview exists

Run a browser/screenshot pass at:

- 320px
- 375/390px
- 430px
- tablet (~768px)
- desktop (~1280–1440px)

Review Home, Words, word detail, Review landing/session, Practice, Writing, Reading, and the Add Vocabulary sheet.

The rendered pass should specifically check visual hierarchy, text wrapping, bottom-navigation collisions, sticky control placement, contrast, disclosure density, empty/error states, and focus visibility.
