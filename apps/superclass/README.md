# Superclass product demo

Superclass is an isolated Next.js application for turning an idea, source text, transcript, or video into a complete language lesson. It does not share LogoCut routes, branding, analytics, payment credentials, customer data, or environment variables.

## Run locally

```bash
cd apps/superclass
npm install
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Product capabilities

- Idea, text/transcript, and video source modes
- Searchable target- and support-language controls with stable language IDs and explicit smart, target-only, bilingual and support-heavy modes
- YouTube URL normalization, automatic caption-provider flow, editable imported transcripts, media-upload transcription fallback, and privacy-enhanced embedding
- A0–C2; 25, 30, 45, 50, 60 and 90-minute presets; custom 20–120-minute durations; individual/group, dialect, skills, focus and practice-density controls
- Local-only student profiles with teaching preferences, lesson continuity, topic/vocabulary history and repetition avoidance
- Five anonymized demo presets
- Plan-first deterministic and AI lesson providers with topic locking, a language-output contract, specialized grammar planning, level-specific pedagogy and duration-specific screen density
- Shared request and lesson validation with content limits, duplicate detection, topic-coverage scoring, wrong-language detection, layout variety and one structured provider repair
- Lesson overview, slide strip, edit controls, teacher notes and a true 16:9 Lesson Player with varied reusable layouts, modules, progress, activity state, teacher/student privacy, fullscreen and keyboard navigation
- Server-generated Student Workbook and Teacher Pack PDFs with distinct content, page numbering, writing space and reliable Spanish text support
- Post-class recap, corrections, vocabulary, grammar, pronunciation, homework, next-class suggestion and copy-ready student message
- Latest/recent local draft persistence, restore, duplicate, and delete
- Marketing preview lock controlled by `NEXT_PUBLIC_SUPERCLASS_UNLOCKED=true`
- Provider-agnostic analytics wrapper with external tracking disabled
- Pricing presentation only; no checkout

## Architecture

- `types/` — stable request, screen, and lesson contracts
- `lib/validation/` — shared request, URL, and generated-content validation
- `lib/providers/` — server-only provider interface, plan-aware prompts, timeout/error boundary, deterministic provider and one-attempt structured repair
- `lib/lesson/` — pedagogical planning, language contracts, quality scoring, deterministic topic templates and teacher/student projection
- `lib/transcripts/` — caption/import and uploaded-media transcription provider interface
- `lib/storage/` — versioned local draft serialization and browser store
- `lib/pdf/` — serverless `pdf-lib` document generation; no browser or Chromium runtime
- `lib/analytics/` — safe categorical event contract and disabled default provider
- `components/` — focused builder, workspace, classroom, and marketing UI
- `app/api/lessons` — validated server route and request ID boundary
- `app/api/transcripts` — normalized caption import and uploaded-media transcription boundaries

### Generation pipeline

Every provider receives the same validated `LessonPlan` before it creates screens:

1. **Plan** — locks the exact topic, topic type, target/support languages, CEFR level, objectives, required structures and keywords, activity sequence, language distribution, and prohibited unrelated content.
2. **Generate** — creates only screens allowed by that plan, using an explicit layout contract.
3. **Validate** — checks schema safety, duration, source grounding, answer evidence, topic coverage, requested language, bilingual support, CEFR suitability, activity relevance, layout variety and preset leakage.
4. **Repair once** — returns the validation findings to the same provider while preserving the original request. A second invalid result fails visibly; it is never replaced by generic local content.

Focused grammar lessons require at least 80% topic coverage. General lessons require at least 55%. The language validator combines explicit target-language evidence, topic terms and common wrong-language markers rather than relying on a raw character ratio.

The local provider supports realistic no-cost development for grammar, vocabulary, conversation, pronunciation, text comprehension and video comprehension. Common Spanish grammar topics receive specialized planning, and `ser`/`estar` receives a complete 17-screen bilingual B1 sequence with comparison, rules, examples, sorting, selection, gap fill, error correction, contextual situations, personal speaking, dialogue, recap, homework and a private answer key.

### Provider configuration

Copy `.env.local.example` to `.env.local` inside this directory. All provider settings are Superclass-specific and server-only:

- `SUPERCLASS_LESSON_PROVIDER` — `local` (default) or `openai`
- `SUPERCLASS_OPENAI_API_KEY` — required only when `openai` is selected
- `SUPERCLASS_OPENAI_MODEL` — defaults to the cost-conscious `gpt-5.4-mini`
- `SUPERCLASS_PROVIDER_TIMEOUT_MS` — 1,000–120,000 ms; defaults to 45,000
- `SUPERCLASS_MAX_SOURCE_CHARS` — 500–12,000; defaults to 12,000
- `SUPERCLASS_GENERATION_CACHE` — `memory` (default) or `none`

The local provider is an explicit development and fallback **mode**, not an automatic fallback after an AI error. If OpenAI fails, times out, refuses, returns malformed JSON, or returns a schema-invalid lesson, the request fails visibly. At most one retry is attempted, and only for safe transient failures such as a timeout, rate limit, or server error.

The OpenAI provider uses the Responses API with strict JSON Schema output. The response then passes the independent `validateLessonDraft` runtime boundary, including request matching, duration screen limits, unique prompts, source grounding, teacher notes, and answer evidence.

No paid API calls occur during tests or builds. Provider tests inject mocked fetch responses.

### Transcript configuration

Transcript settings are also Superclass-only and server-side:

- `SUPERCLASS_TRANSCRIPT_PROVIDER` — `local`, `configured-provider`, or `none`. Development defaults to `local`; production defaults to `none`.
- `SUPERCLASS_TRANSCRIPT_ENDPOINT` — HTTPS endpoint used by `configured-provider`.
- `SUPERCLASS_TRANSCRIPT_API_KEY` — optional bearer credential sent only from the server to that endpoint.

`configured-provider` uses one narrow contract:

- Caption request: JSON `{"operation":"captions","url":"<normalized YouTube URL>"}`
- Upload request: multipart form data with `operation=transcribe` and `file`
- Response: JSON containing a non-empty `transcript`, with optional `platform` and `mediaId`

The local provider returns clearly labeled mock captions/transcripts for development and tests. It never claims to have contacted YouTube. The configured provider may import only captions available through its supported, lawful integration; Superclass does not scrape pages or download protected video content. When captions are unavailable, the builder presents uploaded-media transcription as the primary fallback and manual transcript entry as an advanced secondary fallback.

### Diagnostics and privacy

In development, `/diagnostics` shows the selected provider, model, request duration, estimated tokens and cost, validation result, attempt count, outcome, content hash, and request ID. The route returns 404 in production.

Generation logs contain only operational and categorical metadata: request ID, content hash, provider/model, timings, token/cost estimates, CEFR level, duration, source mode, source character count, screen count, validation result, attempt count, outcome, and error code. They never include source or transcript text, interests, goals, difficulties, strengths, student details, API keys, or provider response bodies.

The cache is represented by `GenerationCache`; the included in-memory implementation is process-local and keyed by a provider/model-aware content hash. A durable encrypted cache can replace it without changing generation orchestration.

### Cost planning

The default `gpt-5.4-mini` estimator uses current standard pricing of $0.75 per million input tokens and $4.50 per million output tokens. With a short source and the app’s duration-specific output budgets, estimated generation costs are approximately:

| Duration | Estimated tokens (input + output) | Estimated cost |
| --- | ---: | ---: |
| 30 min | 1,820 + 4,500 | $0.0216 |
| 45 min | 1,820 + 6,500 | $0.0306 |
| 60 min | 1,820 + 9,000 | $0.0419 |
| 90 min | 1,820 + 13,000 | $0.0599 |

Actual usage varies with source length, model behavior, regional processing, and future pricing. Unknown custom models display token estimates without inventing a cost.

## Known limitations

- Production caption import and uploaded-media transcription require a separately operated, lawful `configured-provider` endpoint; no third-party transcript service is bundled
- The local transcript provider is intentionally mocked and is never a source of real captions
- The generic language detector is heuristic; provider schema, topic terms and language evidence are combined to prevent obvious wrong-language output, but it is not a full linguistic classifier
- The strongest deterministic coverage is currently Spanish grammar and Spanish/English classroom scaffolding; the AI provider remains the path for broad production-quality language/topic coverage
- Uploaded media is limited to 100 MB at the application boundary and may be subject to stricter hosting-platform request limits
- The in-memory cache and diagnostics history are process-local and reset between server instances
- Cost and token figures are planning estimates rather than provider billing records
- No accounts, teams or cloud database
- Student profiles, history and drafts are device/browser-specific and can be deleted together from the privacy control
- No payment or unlock implementation
- PDFs use built-in Helvetica fonts (including common Spanish characters); unsupported typography is normalized safely
- No PowerPoint or Google Slides export
- Video embedding depends on the host allowing embeds
- Regeneration is represented at the provider interface but only a lightweight local screen regeneration method exists

## Future shared packages

LogoCut already contains useful generic patterns that could later become repository-level packages: job lifecycle, storage, payments, email, analytics, and error handling. They remain untouched in this PR to avoid a risky repository-wide migration and to preserve LogoCut production behavior exactly.
