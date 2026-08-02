# Text to Class: Canva layout migration

## Product decision

Superclass must stop behaving like a configuration-heavy lesson builder. The default product is now one simple creation flow:

1. Paste an idea, source text, transcript, or YouTube URL into one field.
2. Choose target language, level, and duration.
3. Generate.
4. Open the finished lesson directly in an immersive interactive player.

The product promise is:

> Paste an idea, text, or YouTube video. Get a beautiful interactive class ready to teach.

Do not expose internal planning, archetypes, provider settings, student profiles, dialect controls, practice-density controls, or other advanced metadata in the default flow. Secondary options may live under one collapsed `More options` area.

## Source design system

Use the user's own PREPLY-ITALKI CANVA 2 / CANVA IA 2 interactive HTML lessons as the visual and interaction reference. Do not claim access to Canva proprietary code. Reuse and adapt only the user's own generated HTML patterns and design language.

The recovered reference includes these concrete patterns:

- Full-screen hero cover with a background photo, dark overlay, large title, subtitle, and primary CTA.
- Fixed compact top navigation with lesson title, current module, progress bar, and progress percentage.
- Image-led category dashboard with 2x4 clickable cards, image overlays, hover scaling, and large labels.
- Split-screen composition with a large image on the left and questions or tasks on the right.
- Large question cards with a colored accent border.
- Clickable photo cards with selected state and visible outline.
- Story cards with hover state and large touch targets.
- Vocabulary or expression screens built from repeated large cards.
- Role-play scenario selection.
- Clear next/back/menu buttons and direct navigation between activities.
- One activity focus per screen.
- Large readable text suitable for screen sharing and Zoom.
- Strong use of real photos rather than unrelated decorative SVG filler.

## Immediate MVP scope

### Builder

Replace the current visible builder with one compact card.

Required controls, visible by default:

- One textarea/input labeled `What do you want to teach?`
- Helper text: `Paste an idea, text, transcript, notes, or a YouTube link.`
- Target language dropdown.
- Level dropdown: A0, A1, A2, B1, B2, C1, C2.
- Duration dropdown: 30, 45, 60, 90 minutes.
- One primary button: `Create class`.

The same field must auto-detect:

- short idea;
- long source text;
- transcript;
- YouTube URL.

Do not show Idea/Text/Video as three separate tabs.

`More options` remains collapsed by default and may contain support language and special instructions only.

### Post-generation workspace

After generation, open the lesson immediately in a simple two-column workspace:

- Left: vertical slide thumbnails.
- Center/right: active 16:9 interactive slide.
- Bottom or top: one small text field labeled `Describe a change`.
- Primary actions: `Present`, `Regenerate slide`, `Save`.

Do not show a dense editor, technical metadata, or permanent teacher notes panel.

### Player

The player must feel like the reference CANVA IA 2 apps, not like a document viewer.

Required:

- 16:9 stage that uses the available viewport without clipping.
- Compact top bar.
- Visible progress.
- Large next/back buttons.
- Fullscreen.
- Student view that hides answers.
- Teacher answers only on demand.
- No permanent `Reset` button when the activity has no mutable state.
- No giant generic title that clips at the top.
- No unrelated repository-owned SVG diagrams as default hero art.

## Layout library to implement first

Build these 12 reusable React layouts and map the lesson schema to them:

1. `HeroCover`
   - full-bleed photo or strong color field;
   - overlay;
   - large title;
   - short subtitle;
   - CTA.

2. `ImageMenuGrid`
   - 4 to 8 clickable image cards;
   - selection or navigation behavior;
   - overlay labels.

3. `SplitImageQuestions`
   - large image left;
   - 3 to 5 large question cards right;
   - optional mini-task.

4. `BigQuestionCards`
   - 2 to 6 large cards;
   - each card can be selected or marked complete.

5. `PhotoChoice`
   - 2 to 6 images;
   - selected outline;
   - optional follow-up prompt.

6. `VocabularyCards`
   - term, meaning, and optional example;
   - click to reveal or flip.

7. `ExpressionBank`
   - large expression cards;
   - meaning or use shown beneath;
   - no dense paragraphs.

8. `RolePlayScenarios`
   - clickable scenario cards;
   - reveal role A / role B after selection.

9. `SentenceBuilder`
   - large word/phrase chips;
   - select/reorder to build a sentence;
   - reset only when state exists.

10. `SortingBoard`
    - two or three large categories;
    - selectable/movable cards;
    - clear completion state.

11. `DialogueStage`
    - large speech bubbles;
    - progressive reveal;
    - optional role assignment.

12. `FinalMission`
    - one clear speaking or writing challenge;
    - checklist;
    - optional timer;
    - finish button.

## Visual systems

Implement four coherent visual systems. The generator chooses one per class and keeps it consistent:

1. `Editorial Light`
   - cream/white background;
   - navy text;
   - coral, gold, or sky accents;
   - real photography;
   - clean and premium.

2. `Bold Dark`
   - near-black/navy background;
   - indigo/purple accents;
   - real photography;
   - high contrast.

3. `Playful Pastel`
   - light background;
   - soft color cards;
   - large rounded controls;
   - beginner-friendly without looking childish.

4. `Travel Magazine`
   - image-led;
   - editorial headlines;
   - map/location cues;
   - culture/travel lessons.

Do not randomize colors independently per slide. One class must look intentionally art-directed.

## Generation pipeline

Keep existing provider, validation, transcript, and lesson planning infrastructure where useful, but insert a visual brief stage before screen generation.

The provider must first return a `CreativeBrief`:

- normalized title;
- topic;
- level;
- objective;
- visual system;
- palette token;
- image direction;
- pedagogical arc;
- ordered slide purpose list.

Then generate screens that reference one of the 12 layout IDs above.

The raw user command must never be used as the title. Correct obvious language errors in the request before planning.

Example:

Input:

`Haceme una clase sobre verbos er estar`

Normalized result:

- title: `SER y ESTAR`
- topic: contrast between ser and estar
- level: inferred or selected level
- visual system: Editorial Light or Playful Pastel
- pedagogical arc: context -> contrast -> guided choice -> sorting -> correction -> personal speaking -> final mission

## Image policy

For the first implementation:

- Prefer source video thumbnail/frame when a YouTube source exists and lawful metadata is available.
- Support teacher-provided images.
- Support curated external photo URLs through a provider abstraction.
- Fall back to strong typography, color blocks, icons, or simple diagrams only when no relevant photo exists.
- Never label unrelated decorative SVG art as if it represented the lesson topic.

Tests and local builds must not make paid image or AI calls.

## Acceptance lesson

Use this exact request for visual acceptance:

- input: `Create a B1 Spanish class about ser and estar for an English-speaking student`
- target language: Spanish
- support language: English
- level: B1
- duration: 60 minutes

Expected output:

- 12 to 14 screens;
- title `SER y ESTAR`, never the raw command;
- materially different compositions across the lesson;
- at least one HeroCover;
- one visual comparison screen;
- one BigQuestionCards or PhotoChoice screen;
- one SortingBoard;
- one error-correction interaction;
- one DialogueStage;
- one personal speaking screen;
- one FinalMission;
- no generic `Palabras / Verbos / Frases / Preguntas` opening menu unless the lesson specifically requires a menu;
- no clipped title;
- no irrelevant SVG filler;
- all buttons functional;
- student view hides answers;
- teacher answer reveal works;
- no excessive explanatory text.

Also validate:

- A0 beginner visual lesson;
- B2 discussion lesson;
- YouTube-source lesson with transcript provider mocked in tests.

## Non-goals for this branch

Do not add:

- payments;
- accounts or teams;
- cloud database;
- PowerPoint export;
- PDF redesign;
- LogoCut changes;
- Google Ads changes;
- production transcript scraping;
- a freeform Canva clone editor.

## Required engineering work

- Replace the default builder UI.
- Add the 12-layout renderer.
- Add visual-system tokens.
- Update lesson schema and provider prompts to select layout IDs.
- Preserve existing validation and add layout coverage validation.
- Remove the permanent generic canvas composition from the primary player path.
- Reuse existing interaction state helpers where they fit.
- Add responsive desktop/tablet/mobile behavior.
- Add unit and integration tests.
- Add browser screenshots for the acceptance lessons.

## Required commands

From `apps/superclass`:

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Do not merge or manually deploy. Open a Draft PR and return screenshots, tests, final SHA, PR URL, and remaining limitations.
