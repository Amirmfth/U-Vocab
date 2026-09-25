# U-Vocab

**U-Vocab** is a personal vocabulary learning and management application designed around a simple idea:

> Vocabulary should be learned as a connected lexical system, not as a pile of flashcards.

Instead of making flashcards the center of the experience, U-Vocab acts as a **personal vocabulary database**. It helps users collect words, understand how they are actually used, organize their knowledge, and progressively turn encountered vocabulary into active vocabulary.

The initial focus is **German vocabulary learning**, while the underlying architecture should remain flexible enough to support additional languages later.

---

## Core Philosophy

Traditional vocabulary apps often reduce learning to:

**word → translation → repetition**

U-Vocab takes a richer approach.

A word is treated as a **lexical entry** containing the information necessary to actually understand and use it:

* meaning
* translation
* grammatical information
* example sentences
* context
* pronunciation
* related words
* synonyms and antonyms
* word families
* collocations
* usage notes
* learning progress

The goal is not simply to remember that two words correspond to each other.

The goal is to **understand the word well enough to use it naturally**.

---

# Features

## Personal Vocabulary Database

Every user builds their own vocabulary collection.

Instead of creating disposable flashcards, words become persistent entries in the user's vocabulary database.

A vocabulary entry can contain structured information such as:

* word / lemma
* translation
* definition
* part of speech
* grammatical properties
* pronunciation
* example sentences
* notes
* tags
* related vocabulary
* learning state
* creation and review history

For German vocabulary, entries may additionally contain language-specific information such as:

### Nouns

* grammatical gender
* article
* plural form
* case-related information where useful

Example:

```text
der Tisch
Plural: die Tische
Meaning: table
```

### Verbs

* infinitive
* separability
* reflexive usage
* auxiliary verb
* past participle
* simple past
* relevant prepositions
* case requirements

Example:

```text
sich erinnern an + Akkusativ

erinnern
erinnerte
hat erinnert
```

### Adjectives

Entries may contain:

* comparative
* superlative
* common constructions
* associated prepositions

---

# AI-Assisted Vocabulary

AI is intended to reduce the amount of manual work required to create useful lexical entries.

The application uses the **OpenAI API** as its AI provider.

When a user adds a word, AI can help generate or infer structured information such as:

* definitions
* translations
* grammatical information
* example sentences
* usage explanations
* collocations
* synonyms
* antonyms
* related vocabulary
* word families
* register and usage notes

The generated information should remain editable by the user.

AI should assist with building the vocabulary database rather than replacing it with a generic chatbot experience.

---

# Context-Aware Vocabulary

Words should not exist in isolation.

U-Vocab should preserve the context in which vocabulary was encountered.

A user may add vocabulary from:

* books
* articles
* conversations
* classes
* movies
* television
* podcasts
* websites
* personal writing

An entry may therefore include the original sentence or surrounding context.

This allows the learner to remember not only **what a word means**, but **how it was actually used**.

---

# Lexical Relationships

Vocabulary naturally forms a network.

U-Vocab should model relationships between entries such as:

```text
synonym
antonym
word family
derived word
related concept
common collocation
```

For example:

```text
fahren
├── die Fahrt
├── der Fahrer
├── die Fahrerin
├── abfahren
├── erfahren
└── das Fahrzeug
```

Over time, the user's vocabulary collection becomes a personal **lexical network** rather than a flat list of unrelated words.

---

# Learning States

Words can move through different stages of familiarity.

For example:

```text
New
↓
Learning
↓
Familiar
↓
Known
↓
Active
```

The distinction between **recognizing** a word and being able to **actively produce** it is important.

A learner may understand a word while reading long before they can confidently use it while speaking or writing.

U-Vocab should make that distinction visible.

---

# Review & Practice

Flashcards can still exist, but they are a **practice mechanism**, not the core data model.

Practice modes can eventually include:

* recognition exercises
* translation exercises
* sentence completion
* contextual questions
* active recall
* writing exercises
* listening exercises
* AI-generated exercises

Exercises should be generated from the user's existing vocabulary database whenever possible.

---

# Search & Organization

As the vocabulary collection grows, finding and organizing words becomes increasingly important.

Users should be able to search and filter vocabulary by properties such as:

* word
* translation
* language
* part of speech
* tag
* learning state
* date added
* source
* grammatical property

Future versions may also support **semantic search**, allowing queries such as:

```text
words related to transportation
```

or:

```text
German verbs I learned recently that require the dative
```

---

# Technology

U-Vocab is designed as a modern web application.

## Database

**Neon Postgres**

Neon provides the application's PostgreSQL database.

The database stores structured information including:

* users
* vocabulary entries
* lexical metadata
* relationships
* examples
* tags
* learning progress
* review history

The schema should use PostgreSQL's relational capabilities rather than storing the entire vocabulary model as unstructured AI-generated text.

## AI

**OpenAI API**

OpenAI provides AI-powered functionality such as:

* vocabulary analysis
* structured lexical extraction
* definitions
* translations
* examples
* grammatical explanations
* relationship discovery
* exercise generation

AI responses should preferably use structured outputs so generated information can be validated before being persisted.

---

# Architecture

At a high level:

```text
                    ┌───────────────┐
                    │    U-Vocab    │
                    │      UI       │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Application  │
                    │     Layer     │
                    └───────┬───────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
       ┌───────────────┐         ┌───────────────┐
       │ Neon Postgres │         │    OpenAI     │
       │               │         │      API      │
       └───────────────┘         └───────────────┘
```

The database remains the source of truth.

AI enriches and operates on vocabulary data but should not become the application's storage layer.

---

# Development Roadmap

## Phase 1 — Foundation

Build the core application and vocabulary data model.

Primary goals:

* project architecture
* Neon database integration
* database schema
* vocabulary CRUD
* vocabulary list
* vocabulary detail view
* vocabulary creation workflow
* basic search and filtering
* OpenAI integration
* AI-assisted lexical entry generation

The result should already function as a useful personal vocabulary database.

## Phase 2 — Rich Lexical Data

Expand vocabulary entries beyond basic definitions.

Potential additions include:

* grammar metadata
* examples
* collocations
* synonyms
* antonyms
* word families
* lexical relationships
* source/context tracking

## Phase 3 — Learning System

Introduce structured learning and review.

Potential features:

* learning states
* review history
* spaced repetition
* active vs. passive vocabulary tracking
* contextual exercises
* AI-generated practice

## Phase 4 — Vocabulary Intelligence

Use the accumulated vocabulary database to provide higher-level insights.

Examples:

* vocabulary growth statistics
* weak vocabulary detection
* frequently forgotten words
* vocabulary grouped by topic
* lexical relationship discovery
* personalized exercises
* semantic vocabulary search

---

# Design Principles

### Database First

The user's vocabulary database is the central product.

Learning tools operate on top of it.

### Structured Data

Lexical information should be stored in structured fields and relationships whenever practical.

This makes vocabulary searchable, filterable, analyzable, and reusable.

### AI as an Assistant

AI should automate tedious vocabulary research and generate useful learning material.

Users should retain control over their vocabulary data.

### Context Matters

Words should retain examples and the context in which they were encountered.

### Language-Aware Modeling

Languages have different grammatical structures.

The application should support language-specific lexical metadata without making the entire architecture German-specific.

### Progressive Complexity

Adding a word should be fast.

Users should not have to manually complete dozens of fields before saving vocabulary.

AI and later enrichment can progressively add additional information.

---

# Long-Term Vision

U-Vocab should evolve into a **personal lexical knowledge system**.

Instead of asking:

> "Which flashcards do I need to review?"

the application should eventually help answer questions such as:

> "Which words can I recognize but still struggle to use?"

> "Which German prepositions do I repeatedly get wrong?"

> "What vocabulary have I encountered while reading this book?"

> "Which words are connected to vocabulary I already know?"

> "What should I practice today?"

The objective is to make vocabulary learning **structured, contextual, searchable, and increasingly personalized as the user's vocabulary database grows**.

---

## Status

U-Vocab is currently under active development.

The initial implementation focuses on the application's foundation and core vocabulary database.

---

## License

License information will be added as the project develops.


---

# Private deployment authentication

U-Vocab is a personal single-user application. Configure `APP_AUTH_USERNAME`, `APP_AUTH_PASSWORD`, and `APP_USER_EMAIL` as server-only Vercel environment variables for Preview and Production. Do not prefix the credential variables with `NEXT_PUBLIC_`.

The application issues a signed, HTTP-only, SameSite session cookie. Pages and `/api/*` routes are private by default, and the current-user boundary also asserts authentication for Server Actions. Changing either configured credential invalidates existing signed sessions.

For local development only, `APP_AUTH_DISABLED=true` explicitly bypasses the gate. The bypass is ignored in production. Redeploy Vercel after credential changes.
