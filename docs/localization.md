# UI localization

U-Vocab keeps interface language separate from both the target learning language and the course explanation/translation language.

## Supported locales

- en — English, LTR
- fa — Persian, RTL

The persisted account setting is User.uiLocale. Course settings such as UserCourse.explanationLanguage are intentionally independent.

## Architecture

The typed localization layer lives in src/i18n/:

- config.ts — locale registry and document direction
- en.ts / fa.ts — typed message catalogs
- core.ts — lookup, interpolation, and plural selection
- server.ts — account/cookie locale resolution for server components
- client.tsx — React context for client components
- format.ts — locale-aware date/number/percent/relative-time formatting
- learning-content.tsx — explicit language/direction for German, English, and Persian learning text
- fonts.css — UI font variables and the IRANYekan hook

English is the migration/default locale. The u-vocab-ui-locale cookie mirrors the account preference so signed-out auth screens can retain the last selected interface language on the same browser.

## IRANYekan

IRANYekan is commercial software. No font binary is committed by this change.

To enable it in a licensed deployment, place the licensed variable WOFF2 file at:

public/fonts/iranyekan/IRANYekanXVF.woff2

The stylesheet already declares that path and falls back to Tahoma/Arial when the file is absent. Do not download or redistribute IRANYekan through this repository unless the project has a license that explicitly permits it.

## Mixed direction content

UI direction follows the account locale, but learning content must declare its own language and direction.

Use LearningText or learningContentAttributes() for learner-visible foreign-language content:

- German: lang="de" dir="ltr"
- English: lang="en" dir="ltr"
- Persian: lang="fa" dir="rtl"

This avoids punctuation and ordering problems when German or English appears inside the Persian RTL shell.
