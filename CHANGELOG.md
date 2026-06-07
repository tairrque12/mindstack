# Changelog

All notable changes to MindStack are documented here.

## [0.1.0.0] - 2026-06-07

### Added
- **FastAPI backend** — 4 routes: `POST /capture`, `POST /capture/image`, `POST /apply` (SSE streaming), `GET /nodes` with pagination and source_type filter
- **10 knowledge source types** — book, tweet, youtube, podcast, voice_memo, linkedin, reddit, conversation, handwritten, note (`SourceType` enum shared across all services)
- **GBrain-native ingest** — `POST /capture` embeds knowledge into GBrain via `gbrain put` with full YAML frontmatter; Claude extracts metadata (tags, insight, principle, applicable_domains)
- **Camera capture** — `POST /capture/image` accepts image uploads, runs Claude vision OCR, then ingests extracted text; images auto-resized to 1024px max
- **Semantic query with SSE streaming** — `POST /apply` retrieves relevant nodes via `gbrain query` and streams a synthesized action plan from Claude token by token
- **X-API-Key auth** — all routes require `X-API-Key` header; missing/wrong key returns 403
- **CORS** — configurable via `CORS_ORIGINS` env var (defaults to `https://mindstack.netlify.app`) for Netlify frontend

### Changed
- GBrain handles all knowledge storage and retrieval — no direct Supabase writes
- `ingest.py` rewritten to write GBrain YAML frontmatter pages via subprocess; supports `extra_metadata` for source-specific fields (episode title, duration, subreddit, etc.)
- `query.py` rewritten to use `gbrain query` + `gbrain get` for retrieval; synthesis uses async SSE streaming via `AsyncAnthropic`

### Fixed
- API key comparison uses `hmac.compare_digest` to prevent timing side-channel attacks
- `source_type` validated against `SourceType` enum allowlist on all write paths (injection prevention)
- File uploads limited to 10 MB with content-type allowlist; PIL decompression bomb guard set at 20 MP
- `SourceType` enum values normalized to plain strings before YAML serialization (PyYAML `!!python/object/apply` tag bug)
- `yaml.safe_load` result guarded against non-dict types in query parser
- Async routes wrap all blocking subprocess/Claude calls in `asyncio.to_thread`
- SSE chunks escape embedded newlines per spec
- Internal exception details not exposed in HTTP error responses
- `subprocess.CalledProcessError` caught in ingest; `ingest_node` failure in image capture route returns 500 gracefully

### Infrastructure
- `requirements.txt` — 17 packages pinned
- `pytest.ini` — `asyncio_mode = auto`; 42 tests across 5 files (utils, ingest, query, capture, api)
- `backend/.env.example` — documents required env vars
- `TODOS.md` — full task list with T01-T11 complete, T12-T14 deferred
