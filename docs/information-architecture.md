# U-Vocab information architecture

Issue #53 makes four concepts the permanent learning architecture:

1. Home
2. Words
3. Review
4. Practice

Existing feature URLs are preserved. Ownership is defined centrally in `src/lib/navigation.ts`.

## Home

Home is the dashboard and next-action surface.

It owns:

- due-review summary
- vocabulary/weakness/mistake status
- recommended next action
- direct access to Review and Practice
- access to full Progress analytics

The former all-features discovery grid has been removed.

`/progress` remains available and belongs to Home, but it is no longer a primary navigation destination.

## Words

The Words hub remains at `/vocabulary`.

It owns:

- vocabulary library
- add word
- topic packs
- recommendations
- compare words
- Vocabulary Universe

Words also exposes text import as a contextual action. The actual reading/import experience remains at `/read`, which belongs to Practice → Reading because its primary workflow is contextual reading practice.

Primary Words views:

- All
- Weak
- New
- Mastered
- Packs

No existing feature URL changed.

## Review

Review is the learning-maintenance area.

It owns:

- standard spaced review
- mistakes
- rescue words
- focus sessions

The Review hub exposes these modes directly.

## Practice

Practice is the skill/application gateway rather than immediately opening a random vocabulary drill.

Primary directions:

### Writing

- `/writing`
- guided/open tasks
- exam-style tasks
- rewrites

### Reading

- `/read`
- pasted-text analysis
- reading library
- `/stories`

### Speaking

- `/conversation`
- `/missions`

Secondary modes:

- `/practice?drill=1` — quick vocabulary drill
- `/battles` — vocabulary battles

Existing links such as `/practice?lexeme=<id>` still open a targeted vocabulary exercise.

## Account/system

Settings and AI Usage are not learning destinations.

Desktop exposes them in a separate Account section.

Mobile keeps Settings in the header; Settings links to AI Usage.

## Route ownership

Active navigation is based on semantic route ownership rather than direct prefix matching.

Examples:

- `/compare` → Words
- `/topic-packs/<id>` → Words
- `/mistakes` → Review
- `/rescue` → Review
- `/conversation/<id>` → Practice
- `/missions` → Practice
- `/stories/<id>` → Practice
- `/battles` → Practice
- `/progress` → Home

This same mapping drives desktop and mobile active states.

Desktop secondary routes also receive a lightweight context trail such as:

- Words / Compare
- Practice / Speaking / Conversation
- Practice / Reading / Stories
- Review / Mistakes

## URL preservation

No route has been removed or redirected in this workstream.

Bookmarks and existing deep links continue to work.

## Accessibility

The navigation retains:

- semantic `nav` landmarks
- `aria-current` on the owned primary section
- keyboard-accessible links
- existing visible focus treatment
- mobile touch targets

The context trail is supplemental; it is not required to understand or operate the primary navigation.
