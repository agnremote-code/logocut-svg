# Superclass MVP

Separate Next.js application for turning a lesson idea, text, transcript, or video concept into a ready-to-teach language lesson.

## Current vertical slice

- Lesson request form
- A0–C2 level selection
- 30/45/60/90 minute lesson duration
- Individual or group class
- Conversation, balanced, or grammar focus
- Retro, clean, or editorial visual direction
- Validated `POST /api/lessons` endpoint
- Structured lesson JSON
- Three-screen preview
- No external AI spend yet

## Run locally

```bash
cd apps/superclass
npm install
npm run dev
```

The next implementation step is to replace the deterministic draft builder in `lib/lesson.ts` with a provider-backed structured generation pipeline while preserving the same request and response contract.
