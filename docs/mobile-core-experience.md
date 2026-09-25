# Mobile-first core experience

Issue #54 applies a dedicated mobile-first product layer on top of the information architecture from #53.

The base/legacy system remains in `globals.css`. New core-screen rules live in `core-experience.css` so further visual work does not keep expanding the global stylesheet.

## Design tokens

The core layer introduces:

- `--space-1` through `--space-6`
- `--tap-target: 44px`
- `--content-reading`
- `--focus-ring`

It continues to use the existing U-Vocab color/surface/radius tokens rather than replacing the product identity.

Geist Sans remains the interface typeface and Geist Mono is used for metrics/numeric precision.

## Responsive targets

The layout is authored for narrow phones first and progressively enhanced at:

- base: ~320px+
- small/tablet transition: 620px
- desktop shell: 940px

Core content avoids fixed content widths on phone and hides normal horizontal overflow. Intentional horizontal scrolling is limited to compact chip navigation/filter rows.

### 320–430px behavior

- primary buttons remain >= 44px
- Home metrics remain a compact three-column status strip
- Words filters use a bottom-sheet-style menu
- vocabulary rows show one translation, state signals, and mastery rather than full lexical metadata
- Review grading remains above the bottom navigation
- Writing submit controls remain reachable above the bottom navigation
- Practice presents three full-width skill lanes and a smaller secondary shortcut grid
- word-detail secondary actions fit into three equal compact controls

## Home

Home now contains:

- daily review state and one dominant next action
- optional Continue card
- real timezone-aware activity today:
  - attempt minutes
  - reviews completed
  - words added
- compact vocabulary/weakness/mistake overview
- compact contextual next actions
- full Progress link

No empty Continue area is rendered.

## Words

The mobile library prioritizes:

1. title + Add / Import
2. search
3. status chips
4. optional advanced filters
5. vocabulary rows

Packs, Recommendations, Compare, and Universe are progressively disclosed under **Explore & tools** instead of permanently occupying six cards above the library.

Rows intentionally omit topic/CEFR badge collections from the scanning surface. They retain:

- lemma/article
- first visible translation
- learner state
- due/weak signal
- mastery percentage + thin bar

Full metadata remains available on word detail.

## Word detail

Above the fold is ordered around:

- lexical identity
- meaning
- mastery
- one primary Teach action
- compact Practice / Explain / Expand actions

Grammar is a disclosure panel.

Review history, encounters, mistakes, and collections are grouped under a single **Learning history & collections** disclosure.

Contextual explanation/examples/connections still stream through the existing Suspense boundary.

## Review

`/review` is now a landing state rather than immediately opening a card.

It shows:

- due count
- unresolved mistake count
- weak-production count
- one Start review CTA when reviews are due
- compact Mistakes / Rescue / Focus modes

The active session is `/review?start=1`.

After grading, the review action redirects back to `/review?start=1`, so the next due card appears immediately instead of returning to the landing page.

On phone, rating controls are sticky above the bottom navigation.

## Practice

Practice uses three primary lanes:

- Writing
- Reading
- Speaking

Each lane uses one icon, short description, and one destination.

Stories, Missions, Quick drill, and Battles are visually secondary in a compact 2x2 shortcut area on phones.

The desktop enhancement turns the three primary lanes into a three-column layout while preserving the same hierarchy.

## Loading states

`RouteLoading` now has page-specific variants:

- Home
- Words
- word detail
- Review
- Practice
- Writing
- Reading

Skeleton geometry follows the eventual content instead of using the previous generic three-card pattern.

Nested loading files select the correct variant, and Writing/Reading landing routes now have their own loading files.

## Pending and mutation feedback

The shared `ActionButton` now:

- accepts an explicit `disabled` state
- exposes `aria-disabled`
- announces pending labels with `aria-live`

High-traffic labels are explicit:

- Checking answer…
- Saving review…
- Preparing your writing task…
- Evaluating writing…
- Analyzing vocabulary in this text…

## Accessibility

Core-screen rules preserve or improve:

- 44px minimum interactive targets
- visible focus rings
- semantic nav/heading structure
- `aria-busy` loading regions
- pending announcements
- text labels in addition to color state
- reduced-motion behavior already provided by the route/reading motion components and global reduced-motion query

## Verification

Static responsive review was performed against the base, 620px, and 940px breakpoints.

The connected Vercel account does not currently expose a U-Vocab project, so no branch preview was available for rendered browser verification from this environment. The repository also has no GitHub Actions workflow. A deployment/browser pass at 320, 375/390, 430, tablet, and desktop remains the final visual/build verification step before merge.
