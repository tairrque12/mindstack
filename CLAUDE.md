# MINDSTACK — Claude Code Operating Manual

## What This Is
MindStack is a personal second brain PWA. It captures everything RIQ learns — books, YouTube, podcasts, voice notes, conversations, tweets, LinkedIn posts — and makes it retrievable and actionable. The core loop: capture knowledge → embed it → query it semantically → get a synthesized action plan built from your own learning.

## North Star
Every feature must answer: does this make it easier to capture knowledge, or does this make the knowledge more useful when retrieved? If neither, don't build it.

## Stack
- **Backend**: Python, FastAPI, Uvicorn
- **Brain**: GBrain (Garry Tan's open source agent brain) on Supabase Postgres + pgvector
- **Embeddings**: OpenAI text-embedding-3-small
- **Synthesis**: Anthropic Claude (claude-opus-4-5)
- **Frontend**: React + Vite, Tailwind CSS, PWA (vite-plugin-pwa)
- **Deployment**: Backend on Render, Frontend on Netlify
- **CI/CD**: GitHub Actions

## GBrain
GBrain is the brain layer. It handles storage, hybrid search (vector + keyword + graph), and retrieval. All knowledge enters and exits through GBrain.

- Config: `~/.gbrain/config.json`
- Supabase project: MINDSTACK (osyhxmqzbusiqtcfwzph.supabase.co)
- Capture: `gbrain capture "text"` or `gbrain capture --file path`
- Search: `gbrain search "query"` (raw retrieval)
- Think: `gbrain think "query"` (synthesized answer with citations)
- Import: `gbrain import <dir>`
- Health: `gbrain doctor`

Never bypass GBrain to write directly to Supabase for knowledge operations. All knowledge reads and writes go through GBrain.

## GStack
GStack skills are available globally. Use them for all engineering work on this project.

Available skills:
- `/office-hours` — before starting any new feature, run this first
- `/plan-ceo-review` — validate product decisions
- `/plan-eng-review` — lock architecture before building
- `/design-html` — build frontend components
- `/review` — before every PR
- `/ship` — to push PRs
- `/qa` — test the running app
- `/cso` — security audit
- `/investigate` — debug systematically, never guess
- `/document-release` — update docs after shipping

Rule: never build a feature without running `/office-hours` first. Never merge without running `/review`. Never ship without running `/ship`.

## Project Structure
mindstack/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── database.py      # Supabase client
│   │   ├── api/             # Route handlers
│   │   ├── services/        # Business logic
│   │   │   ├── ingest.py    # Knowledge ingestion
│   │   │   ├── query.py     # Semantic query + synthesis
│   │   │   └── capture.py   # Image/OCR capture
│   │   └── skills/          # MindStack-specific Claude prompts
│   ├── ingestion/           # Source-specific ingestion scripts
│   ├── cron/                # Background jobs
│   ├── .env                 # Never commit
│   └── requirements.txt
└── frontend/                # React PWA

## What's Already Built
- GBrain initialized on MINDSTACK Supabase (0 pages, clean brain)
- `knowledge_nodes` table (custom schema, may consolidate with GBrain pages table)
- `collections` and `collection_nodes` tables
- `app/database.py` — Supabase client
- `app/services/ingest.py` — embedding generation + Claude metadata extraction + upsert
- `app/services/query.py` — semantic search + synthesis + retrieval counter
- `app/services/capture.py` — image OCR via Claude vision
- Tested: one node ingested and queried successfully

## What To Build Next
1. FastAPI main.py with routes: POST /ingest, POST /query, GET /nodes, POST /ingest/image
2. Frontend PWA — React + Vite + Tailwind, mobile-first, camera access for book capture
3. Manual add flow — paste text, image upload, URL scrape
4. YouTube ingestion script — yt-dlp + Whisper
5. Voice memo ingestion — Whisper transcription
6. Cron jobs — reinforcement scoring, contradiction detection, proactive clustering

## Knowledge Sources
- Physical books — camera capture → Claude OCR → GBrain
- YouTube — yt-dlp + Whisper → GBrain
- Podcasts — Whisper → GBrain
- Voice memos / class notes — Whisper → GBrain
- Tweets — manual paste → GBrain
- LinkedIn posts — manual paste → GBrain
- Reddit — Reddit API → GBrain
- Conversations — voice memo or type → GBrain
- Handwritten notes — camera → Claude OCR → GBrain

## Knowledge Domains
business, product, mindset, design, engineering, health, relationships, creativity, leadership, investing, learning, communication, fitness, weightlifting, running

## TDD Rules
- Every service function gets a test before it ships
- Every API endpoint gets an integration test
- Every bug fix gets a regression test
- Test files live in `backend/tests/`
- Run tests: `pytest backend/tests/`
- No PR merges with failing tests
- Aim for 80%+ coverage on services

## CI/CD Pipeline
GitHub Actions on every push:
- Gate 1: Tests must pass (pytest)
- Gate 2: No secrets in code (gitleaks)
- Gate 3: Lint passes
- Gate 4: Build succeeds

No code reaches production without passing all 4 gates.
Staging deploys on PR open. Production deploys on merge to main.

## Environment Variables
All secrets live in `backend/.env` — never committed.
Required: SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY

## Architecture Rules
- GBrain is the source of truth for all knowledge
- FastAPI is stateless — no in-memory state
- All Claude calls use claude-opus-4-5
- All embeddings use text-embedding-3-small (1536 dims)
- Frontend talks only to the FastAPI backend, never directly to Supabase or GBrain
- PWA manifest + service worker required for iPhone home screen installation

## Cursor Instructions
- Read this file completely before making any changes
- Check existing services before writing new ones — don't duplicate
- Run `/plan-eng-review` before architecting anything new
- Run `/review` before marking any task complete
- Use GBrain for all knowledge operations
- Mobile-first on all frontend work — this app lives on an iPhone home screen
