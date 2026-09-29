# Course architecture

U-Vocab separates account identity from target-language learning state.

## Ownership

`User` owns account-global information such as authentication and timezone.

`UserCourse` owns:

- target language;
- current/target CEFR level;
- explanation/translation language;
- all target-language learner state.

Every existing learner is migrated into one German course without changing IDs on existing learning records.

Top-level learner records keep `userId` for account authorization/admin queries and also store `userCourseId` for course isolation. Child records such as Review, ReadingItem, ConversationTarget, and WritingTarget inherit course ownership from their parent.

## Existing installation migration

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration:

1. creates one German `UserCourse` for every existing user;
2. copies the old current level, target level, and translation preference into that course;
3. sets it as the user's active course;
4. attaches all existing learner state to it;
5. only then removes the old account-global learning columns.

No FSRS card, review, grammar evidence, writing session, conversation, or AI-usage history is reset.

## New accounts before onboarding ships

Until the onboarding issue is implemented, `getCurrentCourse()` lazily creates a default German A1→B2 course for a newly authenticated user who has no course. This is a temporary compatibility bridge, not a language-selection UI.

## Future languages

`src/lib/languages.ts` is the capability registry. German is enabled. French and English are declared but disabled until their dedicated implementation issues are complete.
