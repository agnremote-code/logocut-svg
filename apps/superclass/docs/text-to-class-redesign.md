# Superclass: Text to Class redesign

## Product promise

Paste an idea, text, transcript, correction list, or YouTube URL. Get a beautiful interactive language class ready to teach.

## Non-negotiable UX

The creation screen must show only:

1. One large input labeled `What do you want to teach?`
2. Target language
3. Level
4. Duration
5. Primary button: `Create class`

The single input must automatically detect:

- short idea or instruction
- long text/article/transcript
- YouTube URL

No visible source-mode tabs. No separate Idea/Text/Transcript tabs. No lesson-format selector. No student-profile form. No prompt-copy helper. No class-plan preview before generation. No visible advanced pedagogy controls in the primary flow.

Optional controls belong inside one collapsed `More options` section.

## Generation flow

The system must internally perform:

1. Interpret and clean the raw request.
2. Produce a private creative brief.
3. Produce a pedagogical storyboard.
4. Select a design system and varied layouts.
5. Generate the lesson.
6. Validate visual density, language, topic coverage, repetition, and interaction variety.
7. Repair once if validation fails.

Never use the raw command as the title. Example:

- Raw: `haceme una clase sobre verbos er estar`
- Correct title: `SER y ESTAR`

## Output quality

The result must feel like a polished Canva presentation, not a form or dashboard.

Every lesson must:

- use a true 16:9 stage
- use one main idea per screen
- avoid clipped or oversized text
- avoid repeating the same composition screen after screen
- use a coherent visual identity across the lesson
- vary layout, scale, rhythm, and interaction
- include 10–13 screens for a 60-minute focused lesson unless source material requires otherwise
- include real teaching progression rather than generic categories

Do not generate generic opening menus such as Words / Verbs / Sentences / Questions unless explicitly pedagogically justified.

## Required visual layout library

Implement a controlled library of at least 16 polished layouts, including:

- editorial cover
- image-led question
- split comparison
- visual rule cards
- vocabulary wall
- dialogue scene
- full-screen quote or source extract
- choice grid
- sorting board
- matching activity
- sentence builder
- error correction
- ranking activity
- dilemma/debate cards
- video checkpoint
- recap/challenge

Each layout must have at least two composition variants where practical.

The AI selects layouts; it must not output arbitrary HTML or CSS.

## Required interactions

Support at minimum:

- selectable answers
- reveal answer/model
- flashcards
- sorting
- matching
- sentence construction
- ranking
- reset
- teacher/student view
- keyboard and button navigation

Interactions must be visually integrated into the presentation, not rendered as generic browser controls.

## Creation result screen

After generation, show:

- slide thumbnails on the left
- one large live 16:9 lesson canvas
- `Present` button
- one simple edit box: `Describe a change...`
- regenerate current screen
- duplicate/delete current screen

Do not show a complex workspace, persistent teacher panel, analytics, diagnostics, PDFs, post-class recap, or lesson architecture in the main experience.

Teacher notes and answers remain available behind a compact `Teacher tools` control during presentation.

## AI edit behavior

The edit box must accept natural requests such as:

- Make slide 4 more visual
- Add more speaking practice
- Use Argentinian Spanish
- Make the class more difficult
- Replace this activity with sorting

Edits should target the selected screen unless the request clearly applies to the full lesson.

## Visual systems

Create four strong design systems, selected automatically from the lesson brief:

1. Bold Educational
2. Light Editorial
3. Playful Visual
4. Dark Debate

Each system must define typography, spacing, shapes, borders, image treatment, and interaction states. Do not merely recolor the same template.

## Images and media

- YouTube lessons may embed the video and create timestamp/checkpoint screens when transcript data exists.
- Use relevant repository-owned graphics, teacher-provided images, lawful external image providers, or clearly marked generated-image slots.
- Never use irrelevant decorative SVG filler.
- Never claim an image was generated or retrieved when it was not.

## What to preserve

Preserve and reuse where useful:

- validated lesson request/types
- AI/local provider boundary
- transcript/provider boundary
- topic/language/level validation
- draft persistence
- teacher notes and answer separation
- existing safe interactive state helpers

## What to remove from the primary experience

- visible Idea/Text/Video tabs
- class-plan preview card
- lesson-format selector
- student profile form
- large configuration forms
- permanent teacher panel
- generic repeated card canvas
- PDFs and post-class recap from the primary flow

These may remain internally or be revisited later, but must not complicate the MVP.

## Acceptance test

Generate these four lessons and verify that they are visually and structurally distinct:

1. A1 — Buenos Aires basics — visual, bilingual, image-led
2. B1 — SER vs ESTAR — focused grammar workshop
3. B2 — Las Vegas — conversation, culture, decisions
4. C1 — Ethical dilemma — editorial debate

For each lesson verify:

- no clipping at 1440x1000 and 390x844
- no oversized title obscuring content
- no repeated generic screen composition
- all buttons work
- student view hides answers
- teacher tools are closed by default
- keyboard navigation works
- generated title reflects the topic, not the raw command
- the class can be understood and taught without learning a complex interface

## Safety and scope

- Modify only `apps/superclass`.
- Do not modify LogoCut.
- Do not modify Google Ads.
- Do not merge.
- Do not manually deploy.
- No paid AI, transcription, or image-provider calls during tests or builds.
- Open a Draft PR and provide screenshots, test results, build result, final SHA, and Vercel preview status.
