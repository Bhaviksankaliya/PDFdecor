# PDFdecor

A hub of self-contained PDF tools (merge, split, compress, convert, edit,
secure, AI). Every tool is a standalone page with the same
flow: **upload → configure → process → download**. The homepage is a
searchable, category-filtered grid generated entirely from a single tool
registry.

---

## Status

| Phase | Scope | State |
|------|-------|-------|
| **0** | Monorepo, tool registry, dynamic routing, shared upload/preview/result components, sync pipeline, Docker infra | ✅ done |
| **1** | Core `pdf-lib` sync tools | ✅ done |
| 2 | Binary-backed async tools + workers (OCR, office conversions, protect/unlock) | 🚧 **Compress** + **PDF→Word** done (pure-JS, no binaries) |
| 3 | Advanced editors (edit, forms, redact, compare, sign) | 🚧 **Edit PDF** + **Sign PDF** done |
| 4 | AI (summarize, translate) | ◻️ |
| 5 | Auth, dashboard, workflows, marketing pages, i18n, rate limiting, TTL cron | ◻️ |

**Shipped end-to-end (12 tools):** Merge, Split (ranges / every-N / each-page),
Remove pages, Extract pages, Organize (drag-reorder + per-page rotate/delete),
Rotate, Page numbers, Watermark (text + image), Crop, JPG→PDF, Scan→PDF
(camera capture), PDF→JPG (rendered client-side), **PDF→Word** (text/layout
reconstruction → .docx, no LibreOffice needed), **Edit PDF** (Fabric.js canvas
editor → flatten), and **Sign PDF** (draw/type/upload signature).

Thumbnails and page previews render in-browser with PDF.js; page-level
processing runs server-side through pure `@pdfforge/pdf-core` functions.

---

## Architecture

```
apps/
  web/            Next.js 14 (App Router) + Tailwind frontend
  api/            Express API (+ workers, Phase 2)
packages/
  config/         tool registry, types, shared limits  ← single source of truth
  pdf-core/       pure, testable PDF operations (pdf-lib)
infra/docker/     Dockerfile(s) + docker-compose (web, api, postgres, redis, minio)
```

**Processing model**
- **Sync** tools (`merge`, `split`, `rotate`, …) run inside the API request and
  stream the result back.
- **Async** tools (`compress`, `ocr`, office conversions, AI) create a job,
  enqueue in BullMQ, and are polled via `GET /api/jobs/:id`. *(wired in Phase 2)*

**File lifecycle** — uploads + outputs are stored under a UUID key and
auto-deleted after a 2-hour TTL (swept on an interval in the API; a dedicated
cron worker in prod). The client-declared MIME is never trusted: every upload
is sniffed by magic bytes.

### The tool registry (`packages/config/src/tools.ts`)

The homepage grid, search, category tabs, header mega-menu, and every dynamic
`/[slug]` route are generated from one `TOOLS` array. Each entry declares its
category, accepted MIME types, multi-file support, and `sync`/`async` mode.

---

## Quick start (local dev)

Requires **Node ≥ 20**. The Phase-0 / Phase-1 sync tools need no database,
Redis, or system binaries — just Node.

```bash
npm install
cp .env.example .env        # optional; sane defaults are built in
npm run dev                 # starts API (:3001) and web (:3000) together
```

Open <http://localhost:3000>, pick **Merge PDF**, drop in two or more PDFs,
reorder, and merge.

Run the unit tests:

```bash
npm test -w @pdfforge/pdf-core
```

### Full stack with Docker

Boots web + api + Postgres + Redis + MinIO with all system binaries baked in:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

---

## Required system binaries (Phase 2+)

Installed in `infra/docker/Dockerfile`. For non-Docker dev, install these to
exercise the binary-backed tools:

| Binary | Used by |
|--------|---------|
| **Ghostscript** (`gs`) | Compress PDF, PDF/A, repair fallback |
| **qpdf** | Unlock, Protect, Repair, linearize |
| **LibreOffice** (`soffice --headless`) | Word/PPT/Excel ↔ PDF |
| **Tesseract** (+ language packs) | OCR PDF |
| **poppler-utils** | `pdfinfo`, `pdftoppm` helpers |
| Chromium (Puppeteer/Playwright) | HTML → PDF |

---

## Environment variables

See [`.env.example`](.env.example). The sync tools run with defaults; the
`DATABASE_URL`, `REDIS_URL`, S3, and `ANTHROPIC_API_KEY` values are only needed
for Phase 2+ features.

---

## How to add a new tool

1. **Register it** — add an entry to `TOOLS` in
   `packages/config/src/tools.ts` (slug, title, category, `accepts`,
   `multiple`, `processing`).
2. **Write the processor**
   - *sync*: add a pure function in `packages/pdf-core/src/` and wire it into
     `SYNC_PROCESSORS` in `apps/api/src/processors.ts`.
   - *async*: add a worker handler (Phase 2 infra).
3. **Build the UI** — add a component under
   `apps/web/components/tools/` and register it in `ToolRenderer.tsx`.
   Until then the route renders a `ComingSoon` placeholder automatically.

That's it — the homepage card, mega-menu entry, route, metadata, and dropzone
validation all come from the registry for free.

---

## API surface

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/upload` | Upload one file → `{ fileId }` (MIME sniffed) |
| `POST` | `/api/tools/:slug/process` | Sync: returns `{ downloadUrl }`. Async: `{ jobId }` *(Phase 2)* |
| `GET`  | `/api/jobs/:jobId` | Job status/progress *(Phase 2)* |
| `GET`  | `/api/files/:id/download` | Stream a stored file |
| `GET`  | `/api/health` | Liveness |

All request bodies are validated with `zod`.
