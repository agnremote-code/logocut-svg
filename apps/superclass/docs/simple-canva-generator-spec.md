# Superclass: simple Canva-quality lesson generator

## Product objective

Superclass must reproduce the user's successful workflow in one place:

1. The tutor describes the lesson or pastes a YouTube URL.
2. Superclass interprets the request and creates a structured creative lesson brief.
3. Superclass renders a polished, immediately teachable 16:9 class using level-appropriate visual templates.

The tutor must not need to learn the product, write a technical prompt, choose among many architecture settings, or clean up generic output.

Core promise: **Describe it. Generate it. Teach it.**

## Current defects to remove

- Target and support language controls use an input/datalist pseudo-combobox and do not behave like dependable dropdowns.
- Idea and Text are separate modes although both are text input.
- The builder exposes too many controls and explanatory paragraphs before generation.
- Raw user wording is reused as a title instead of being interpreted and normalized.
- Misspellings such as `verbos er estar` leak into lesson titles and content.
- Automatic routing can produce the wrong level/archetype.
- Generated lessons are generic sequences of cards rather than professionally art-directed classes.
- Too many screens are generated without enough visual or pedagogical value.
- The user must understand modules, plans, formats, teacher tools and internal settings before obtaining a usable class.

## New builder: two creation modes only

Use one compact segmented control labelled **Create from**:

1. **Idea or material**
2. **YouTube video**

### Idea or material

One large textarea accepts any of the following without separate tabs:

- a short idea;
- detailed instructions;
- copied text;
- an article;
- notes;
- vocabulary;
- student corrections;
- a pasted transcript.

Placeholder:

`Example: Create an A1 bilingual class about ser and estar with clear examples, short practice and personal speaking questions.`

The application must infer whether the content is a simple idea, source text or detailed brief.

### YouTube video

Show one URL field and concise copy:

`Paste a YouTube link. Superclass will use available captions to build the class.`

Automatic caption import remains primary. If unavailable, reveal secondary fallbacks only then:

- upload audio/video;
- paste transcript manually.

Do not show fallback complexity before it is needed.

## Essential controls only

The default builder view must contain only:

- Create from
- Idea/material or YouTube URL
- Target language
- Support language
- CEFR level
- Duration
- Generate class

Use real accessible selectors. Target and support languages must be native `select` elements or a fully implemented accessible listbox—not input+datalist.

Spanish and English appear first, followed by common languages and Other.

Defaults may be inferred from the user's latest selection but must remain editable.

## Advanced controls

Put all nonessential settings inside one collapsed control:

`More control`

It may contain:

- dialect;
- class type;
- teaching focus;
- language balance;
- visual direction;
- specific instructions;
- student profile;
- homework preference.

Do not show long explanations. Use one short helper sentence per group at most.

Remove the ChatGPT helper and all external prompt-copying workflow.

## Intent interpreter

Add a deterministic interpretation stage before planning.

It must separate:

- the user's command from the lesson topic;
- requested level;
- requested language;
- grammar target;
- content source;
- activity preferences;
- visual preferences;
- duration;
- support-language needs.

It must normalize obvious wording and spelling without changing meaning.

Acceptance example:

Input:

`Haceme una clase sobre verbos er estar`

Interpreted result:

- title: `SER y ESTAR`
- focus: grammar
- structures: ser, estar
- no literal title `Haceme una clase...`
- no leaked typo `er estar`

The interpreted title must be concise, classroom-ready and written in the target language.

## Internal generation pipeline

Do not expose this complexity to the user.

1. **Interpret** the idea/video and normalize the request.
2. **Create a creative lesson brief** with objective, narrative arc, visual direction, language balance, required content and activity plan.
3. **Select one level-appropriate template family.**
4. **Generate a storyboard** with a strict purpose for every screen.
5. **Render** through professional reusable layouts.
6. **Validate** topic, level, language, visual variety, screen count, readability and completeness.
7. **Repair once** when validation fails.

The creative lesson brief is the internal equivalent of the strong prompt the user currently creates before using Canva. The user must not have to create or copy it manually.

## Professional output standard

Every generated class must feel like a deliberately designed Canva presentation, not a form rendered as slides.

Requirements:

- true 16:9 composition;
- one clear purpose per screen;
- large readable typography;
- concise text;
- real visual hierarchy;
- intentional spacing;
- meaningful diagrams, illustrations or licensed/configured images;
- no huge empty white cards;
- no tiny generic menu cards as the main content;
- no raw request text as title;
- no repeated layout more than twice consecutively;
- no visible internal metadata;
- no permanent teacher panel;
- no unnecessary module list on the opening screen;
- navigation must be understandable without training.

Local mode must use repository-owned illustrations and designed SVG compositions. It must never claim an external or generated image exists when it does not.

## Level-specific art direction

### A0–A1

Default screen count for 60 minutes: 10–13 student screens, not 17 generic screens.

Use:

- visual cover;
- clear objective;
- illustrated vocabulary;
- simple bilingual examples;
- sentence-building support;
- short choice/gap/categorization tasks;
- three or four guided speaking questions;
- recap;
- optional homework.

Spanish is visually primary and English support is directly underneath in smaller type.

### A2–B1

Use:

- strong cover;
- contextual hook;
- concise vocabulary in context;
- clear grammar or functional comparison;
- varied controlled practice;
- correction or transformation;
- short dialogue/scenario;
- personalized speaking;
- recap.

### B2–C2

Use:

- editorial or cinematic cover;
- source-driven visual input;
- vocabulary in context;
- interpretation;
- ranking, dilemma or perspective comparison;
- argument/counterargument;
- extended discussion;
- reflection.

## Required SER/ESTAR acceptance lesson

Input:

`Haceme una clase sobre verbos ser y estar`

Settings:

- Spanish target
- English support
- A1
- 60 minutes

Expected output:

1. Cover: `SER y ESTAR`
2. Visual objective
3. Simple contrast: identity/origin vs location/state
4. SER examples with people and places
5. ESTAR examples with people and places
6. Choose SER or ESTAR
7. Match examples to meaning
8. Complete short sentences
9. Correct four mistakes
10. Build personal sentences
11. Guided speaking questions
12. Fast recap
13. Optional homework

The lesson must not begin with generic cards labelled Palabras, Verbos, Frases and Preguntas.

Do not show the raw command in the title or instructions.

## Player simplification

Default top bar:

- lesson title;
- progress;
- Menu;
- Teacher tools;
- Fullscreen;
- Exit.

Student view may remain inside Teacher tools or as a simple toggle, but avoid five equally prominent controls.

Opening screen must be the designed lesson cover, not an app navigation menu.

Menu opens only on demand.

Teacher tools remain closed and contain only concise optional information.

## Visual asset architecture

Create a `VisualAssetProvider` contract:

- `local`: repository-owned SVG/illustration assets for free testing;
- `configured`: future stock or image-generation provider;
- `teacher-upload`: optional teacher-provided image.

Lesson planning creates explicit image/diagram slots. Rendering must fall back to a designed SVG composition when no image is available.

No paid visual calls in tests.

## Tests and acceptance

Add tests for:

- exactly two creation modes;
- Idea and Text are unified;
- YouTube mode works;
- real target-language dropdown;
- real support-language dropdown;
- Spanish and English first;
- default view contains only essential controls;
- advanced settings are collapsed;
- no ChatGPT prompt-copy helper;
- raw command is not used as title;
- typo-normalized SER/ESTAR interpretation;
- A1 SER/ESTAR produces 10–13 student screens plus optional private answer data;
- no generic Palabras/Verbos/Frases/Preguntas opening menu;
- every screen has a unique pedagogical purpose;
- screen text respects density limits;
- no repeated layout more than twice consecutively;
- blank optional instructions remain valid;
- YouTube captions and fallback behavior;
- desktop and mobile no-overflow;
- LogoCut unchanged.

## Visual acceptance set

Capture and inspect:

1. Empty simple builder at 1440×1000.
2. Open target-language dropdown.
3. Open support-language dropdown.
4. Builder at 390×844.
5. A1 SER/ESTAR cover.
6. A1 SER/ESTAR comparison.
7. A1 interactive practice.
8. B1 idea-based conversation class.
9. B2 YouTube-based class using local/mock captions.
10. Teacher tools closed.

Do not approve if the result is merely the current UI with fewer fields or different colors.

## Validation

Run from repository root:

- `npm run lint`
- `npm test`
- `npm run build`

Run from `apps/superclass`:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Validate at:

- 1440×1000
- 1024×768
- 390×844

No paid AI, transcription or image calls during tests. Do not modify LogoCut, Google Ads, payments, analytics or environment variables. Do not merge or manually deploy.