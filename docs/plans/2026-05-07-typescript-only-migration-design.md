# Design: Migrate to TypeScript-only (Remove Rust Backend)

**Date:** 2026-05-07

## Problem

The project has a Rust/Rocket `book_collector` backend service whose only job is to recursively list PDF files in a public GitHub repo (`J3ke7/e-book`) and return their URLs. This logic is simple enough to live entirely in the TypeScript frontend.

## Decision

Remove the Rust backend. Call the GitHub API directly from the browser using the **Git Trees API**, which returns the full repo tree in a single request.

## Data Flow

```
Browser → GET https://api.github.com/repos/J3ke7/e-book/git/trees/HEAD?recursive=1
       ← { tree: [{ path, type, sha, ... }] }

Filter:  tree items where type === 'blob' && path.endsWith('.pdf')
Map to:  { title: filename, pdf_path: https://raw.githubusercontent.com/J3ke7/e-book/HEAD/<path> }
```

No GitHub token required — the repo is public. Rate limit is 60 unauthenticated req/hour; this migration uses only **1 request** to load all books.

## Files Changed

| File | Action |
|------|--------|
| `site/src/api/BookCollectorAPI.ts` | Rewrite — replace backend HTTP calls with direct GitHub Git Trees call |
| `site/src/config.ts` | Update — remove `bookCollectorUrl`, add `githubOwner`/`githubRepo` |
| `site/src/components/BookshelfViewer.tsx` | Update — remove paginated code path, keep fetch-all only |
| `site/src/components/BookCollectorModal.tsx` | Update — remove paginated method option if present |
| `book_collector/` | Delete entire directory |
| `docker-compose.yml` | Delete |
| `site/scripts/test-github-provider.ts` | New — standalone `tsx` test script |

## Test Script

A standalone script at `site/scripts/test-github-provider.ts` that imports and calls the same GitHub provider function used by the frontend, prints discovered books to stdout, and exits non-zero on error.

```bash
npx tsx site/scripts/test-github-provider.ts
```

## Alternatives Considered

- **Recursive GitHub Contents API** — same result but N+1 requests (one per directory); rate-limit risk.
- **Configurable repo via env vars** — deferred; the source repo is hardcoded in the current backend too, so no regression.
