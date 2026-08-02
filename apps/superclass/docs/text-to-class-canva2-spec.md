# Superclass — Text to Class using Canva IA 2 layouts

## Product decision

Stop extending the current complex lesson builder. Replace the visible creation flow with one simple Text to Class experience while preserving the existing lesson/transcript/provider backend where useful.

The product promise is:

> Paste an idea, text, notes, transcript, or YouTube URL. Get a polished interactive language class ready to teach.

## Primary user flow

The first screen must contain only:

1. One large input labeled `What do you want to teach?`
2. Placeholder: `Describe the class, paste material, or add a YouTube link...`
3. Target language dropdown
4. Student level dropdown
5. Duration dropdown
6. Primary button: `Create class`
7. Small collapsed `More options` section

Do not show separate Idea, Text, and Video tabs. Detect input type automatically:

- YouTube URL -> video source
- long pasted content -> source material
- short natural-language request -> idea

Support language defaults automatically from the user's last choice and lives inside More options.

After generation, open the class immediately. Do not force the user through a complex workspace first.

## Editing flow

The generated-class view has:

- left slide thumbnails
- main 16:9 canvas
- bottom prompt field: `Describe a change...`
- `Regenerate this screen`
- `Present`
- `Save`

Examples of accepted edit prompts:

- Make this screen more visual
- Add more speaking practice
- Use Argentinian Spanish
- Make this activity harder
- Replace this activity with a role play

## Canva IA 2 layout library to migrate

Rebuild the proven visual structures from the user's Canva IA 2 classes as native React components. Do not copy Canva SDK code or Tailwind CDN. Recreate the layouts in the Superclass codebase with accessible semantic React and local CSS.

### Core layouts

1. `HeroCover`
   - full-bleed image or strong graphic background
   - dark/light overlay
   - large title and short subtitle
   - one large start button

2. `VisualMenuGrid`
   - 4–8 image cards
   - each card is a large clickable topic/category
   - visual progress or section label
   - supports non-linear navigation

3. `SplitImageQuestions`
   - image occupies about 45–50% of screen
   - title and 3–5 large question cards on the other side
   - optional mini task and next button

4. `HowItWorksCards`
   - 4–6 large instruction cards
   - icon/number, short heading, one sentence
   - no paragraphs

5. `MapHub`
   - central menu/map with large section buttons
   - allows returning to the hub from every branch
   - supports lessons structured by topics, countries, tenses, or missions

6. `VocabularyExpressionBank`
   - large phrase cards
   - expression plus purpose/meaning
   - optional color grouping
   - one practice button

7. `RolePlayScenario`
   - 2–4 large scenario cards
   - selectable role/situation
   - short instructions and useful language

8. `PhotoChoice`
   - 4–6 visual cards
   - selectable state
   - discussion prompt under the grid

9. `OpinionSwitch`
   - claim cards
   - first defend real opinion, then defend the opposite
   - large selectable statements

10. `RapidFire`
    - 4–6 large questions
    - optional randomizer
    - fast visual rhythm

11. `FinalManifesto`
    - full visual composition
    - final speaking challenge
    - required structures checklist
    - optional timer

12. `DynamicPanel`
    - selected item opens a detail panel
    - intro, useful information, questions, optional challenge
    - clear back button

13. `GrammarContrast`
    - visually distinct A/B or SER/ESTAR columns
    - short rules, examples, and interactive choice

14. `SentenceBuilder`
    - large clickable phrase tiles
    - build/reveal/reset behavior

15. `FeedbackScreen`
    - teacher feedback categories
    - what worked, correction, next step
    - copy-ready student message

## Interaction library

Every class should use at least three interaction types when pedagogically appropriate:

- clickable answer cards
- select one or multiple options
- reveal answer/model
- flashcards
- sorting into two or more categories
- matching
- sentence builder
- photo selection
- random question
- timer challenge
- return-to-map navigation

Buttons must feel like part of the lesson, not browser form controls.

## Visual system

Create four curated design systems, selected automatically from topic and level:

1. `Bright Classroom`
   - white/cream background
   - soft pastel cards
   - large dark typography

2. `Editorial`
   - cream/charcoal
   - strong photography
   - restrained accent colors

3. `Bold Quest`
   - dark navy/black
   - vivid accent gradient
   - image-led cards

4. `Playful Map`
   - colored sections
   - hub navigation
   - mission/progress feeling

Rules:

- true 16:9 stage
- use roughly 90% of available canvas
- one clear focus per screen
- no tiny text
- no long paragraphs
- no generic decorative SVG unrelated to the topic
- no permanent teacher panel
- no giant title clipping
- minimum 18 px body text on desktop presentation mode
- accessible focus and keyboard navigation

## Generation pipeline

Before producing screens, the provider must produce an internal structured creative brief:

- normalized title
- topic
- level
- duration
- lesson goal
- language distribution
- visual system
- visual motif
- screen sequence
- required interactions
- required source/video grounding

The raw user command must never become the lesson title.

Example:

Input:
`haceme una clase sobre verbos er estar`

Normalized brief:

- title: `SER y ESTAR`
- topic: Spanish grammar contrast
- level: inferred or selected level
- visual system: Bright Classroom or Editorial
- sequence: cover -> contrast -> examples -> choice -> sorting -> correction -> situations -> speaking -> recap

## Screen composition rules

- 30-minute class: 8–10 screens
- 45-minute class: 10–12 screens
- 60-minute class: 12–15 screens
- 90-minute class: 16–20 screens

Do not create a generic opening menu unless the lesson is genuinely non-linear.
Do not create repeated screens with only a new title and the same card grid.
No more than two consecutive screens may use the same composition.
At least 40% of screens must be interactive.
At least 30% of screens must be image-led or strongly visual when suitable source imagery exists.

## YouTube behavior

When input is a YouTube URL:

1. obtain lawful transcript/captions through the existing transcript provider
2. identify teachable segments
3. create a video opener
4. add timestamped checkpoints
5. include comprehension, vocabulary in context, opinion, and speaking transfer
6. embed with youtube-nocookie

If no transcript provider is configured, show a clear setup error. Never silently use mock captions in production.

## What to preserve

Preserve where useful:

- validated request contract
- provider interface
- transcript interface
- level and duration logic
- lesson validation
- local draft storage
- teacher answers/notes data
- student/teacher projection

## What to remove from the default flow

- three visible source tabs
- visible lesson archetype selector
- visible class-plan explanation
- large personalization form
- generic ChatGPT prompt helper
- separate complex workspace before presenting
- permanent teacher tools
- repeated Light Editorial shell

Advanced controls may remain behind `More options`, but the default experience must remain simple.

## Acceptance test class

Generate this exact production-quality test:

Input:
`Create a B1 Spanish class about SER and ESTAR for an English-speaking student. Focus on speaking and common mistakes.`

Expected:

- title: `SER y ESTAR`
- 60 minutes
- 12–15 screens
- no raw command as title
- at least 4 distinct visual layouts
- at least 4 interactive screens
- comparison screen
- choice activity
- sorting activity
- error correction
- scenario/role play
- personal speaking challenge
- final recap
- teacher answers hidden by default
- no clipping at 1440x900, 1280x720, 1024x768, 390x844

## Engineering constraints

- change only `apps/superclass`
- do not modify LogoCut
- do not modify Google Ads
- no paid API calls in tests or builds
- keep provider failures visible
- do not merge or manually deploy
- open a Draft PR

## Required verification

Run:

```bash
cd apps/superclass
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Capture:

- simple builder desktop
- simple builder mobile
- generated B1 SER/ESTAR cover
- menu or hub where appropriate
- split image/questions
- interactive sorting
- role play
- final challenge

Report:

- files changed
- migrated Canva IA 2 layout components
- generation changes
- exact SER/ESTAR screen list
- interaction count
- viewport checks
- tests/build
- final SHA
- Draft PR URL
- Vercel Preview status
- known limitations
