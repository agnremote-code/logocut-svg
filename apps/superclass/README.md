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
- YouTube ID parsing and privacy-enhanced embedding
- Explicit transcript requirement for source-grounded video lessons
- A0–C2, four durations, individual/group, dialect, profile, skills, focus, practice density, homework, and opt-in roleplay controls
- Five anonymized demo presets
- Deterministic local lesson provider with level-specific pedagogy and duration-specific screen density
- Shared request and lesson validation with content limits and duplicate detection
- Lesson overview, slide strip, edit controls, teacher notes, classroom mode, answer reveal, timer, and keyboard navigation
- Teacher and student print versions
- Latest/recent local draft persistence, restore, duplicate, and delete
- Marketing preview lock controlled by `NEXT_PUBLIC_SUPERCLASS_UNLOCKED=true`
- Provider-agnostic analytics wrapper with external tracking disabled
- Pricing presentation only; no checkout

## Architecture

- `types/` — stable request, screen, and lesson contracts
- `lib/validation/` — shared request, URL, and generated-content validation
- `lib/providers/` — server-only provider interface, timeout/error boundary, and deterministic demo provider
- `lib/storage/` — versioned local draft serialization and browser store
- `lib/analytics/` — safe categorical event contract and disabled default provider
- `lib/lesson/` — teacher/student projection helpers
- `components/` — focused builder, workspace, classroom, and marketing UI
- `app/api/lessons` — validated server route and request ID boundary

The deterministic provider is intentionally server-only and incurs no external cost. A future AI provider must implement `LessonProvider`; provider failures are surfaced and are never replaced by a fake successful response.

## Known limitations

- No real AI provider or automatic transcript retrieval
- No accounts, teams, cloud database, or reusable named student profiles
- Local drafts are device/browser-specific
- No payment or unlock implementation
- Print uses the browser’s Print / Save as PDF capability
- No PowerPoint or Google Slides export
- Video embedding depends on the host allowing embeds
- Regeneration is represented at the provider interface but only a lightweight local screen regeneration method exists

## Future shared packages

LogoCut already contains useful generic patterns that could later become repository-level packages: job lifecycle, storage, payments, email, analytics, and error handling. They remain untouched in this PR to avoid a risky repository-wide migration and to preserve LogoCut production behavior exactly.
