# TypeScript-Only Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the Rust `book_collector` backend and replace its only function — listing PDFs from a public GitHub repo — with a direct TypeScript call to the GitHub Git Trees API.

**Architecture:** The frontend calls `GET https://api.github.com/repos/J3ke7/e-book/git/trees/HEAD?recursive=1` directly (one request, no token), filters for `.pdf` blobs, and constructs `raw.githubusercontent.com` download URLs. All pagination logic is dropped; books are fetched all at once.

**Tech Stack:** TypeScript, React 19, Vite, GitHub REST API (unauthenticated), `npx tsx` for the test script.

---

### Task 1: Update `config.ts`

**Files:**
- Modify: `site/src/config.ts`

**Step 1: Replace the file contents**

```typescript
export const githubOwner = 'J3ke7';
export const githubRepo = 'e-book';
```

Remove the old `Config` interface and `config` object entirely — `bookCollectorUrl` no longer exists.

**Step 2: Verify no TypeScript errors**

```bash
cd site && npx tsc --noEmit
```

Expected: errors about `config.bookCollectorUrl` usages (in `BookshelfViewer.tsx` and `BookCollectorAPI.ts`) — these will be fixed in later tasks.

**Step 3: Commit**

```bash
git add site/src/config.ts
git commit -m "refactor: replace bookCollectorUrl config with github repo constants"
```

---

### Task 2: Rewrite `BookCollectorAPI.ts`

**Files:**
- Modify: `site/src/api/BookCollectorAPI.ts`

**Step 1: Replace the file contents**

```typescript
import { githubOwner, githubRepo } from '../config';

export interface BookPDFSource {
    title: string;
    author: string | null;
    pdf_path: string;
}

export type BookCollectorSource = 'guy_books';

interface GitTreeItem {
    path: string;
    type: string;
}

interface GitTreeResponse {
    tree: GitTreeItem[];
}

export async function fetchBooks(_source: BookCollectorSource): Promise<BookPDFSource[]> {
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/trees/HEAD?recursive=1`;
    const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const data: GitTreeResponse = await response.json();

    return data.tree
        .filter(item => item.type === 'blob' && item.path.toLowerCase().endsWith('.pdf'))
        .map(item => {
            const filename = item.path.split('/').pop() ?? item.path;
            return {
                title: filename.replace(/\.pdf$/i, ''),
                author: null,
                pdf_path: `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/HEAD/${item.path}`,
            };
        });
}
```

Note: The old `BookCollectorAPI` class, `BookPaginationIterator`, and `createPaginatedBooks` are all deleted. The new export is a plain `fetchBooks` function.

**Step 2: Verify no TypeScript errors in this file**

```bash
cd site && npx tsc --noEmit 2>&1 | grep BookCollectorAPI
```

Expected: errors in consumers (`BookshelfViewer.tsx`, `BookCollectorModal.tsx`) about the old API shape — fixed in later tasks.

**Step 3: Commit**

```bash
git add site/src/api/BookCollectorAPI.ts
git commit -m "refactor: replace backend API client with direct GitHub Git Trees call"
```

---

### Task 3: Write the standalone test script

**Files:**
- Create: `site/scripts/test-github-provider.ts`

**Step 1: Create the scripts directory and file**

```typescript
import { fetchBooks } from '../src/api/BookCollectorAPI';

async function main() {
    console.log('Fetching books from GitHub...');
    const books = await fetchBooks('guy_books');

    if (books.length === 0) {
        console.error('No books found — check the repo or network.');
        process.exit(1);
    }

    console.log(`Found ${books.length} books:\n`);
    for (const book of books) {
        console.log(`  ${book.title}`);
        console.log(`    ${book.pdf_path}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
```

**Step 2: Run the script to verify it works**

```bash
cd site && npx tsx scripts/test-github-provider.ts
```

Expected: a list of book titles and their raw.githubusercontent.com URLs printed to stdout. If the GitHub API returns an error, the error message will be printed and the process exits with code 1.

**Step 3: Commit**

```bash
git add site/scripts/test-github-provider.ts
git commit -m "feat: add standalone test script for GitHub book provider"
```

---

### Task 4: Update `BookCollectorModal.tsx`

**Files:**
- Modify: `site/src/components/BookCollectorModal.tsx`

The modal currently has a fetch-method dropdown (`all` / `paginated`). Drop the `BookFetchingMethod` type and dropdown since pagination is gone. The `onSourceSelected` callback no longer needs a method argument.

**Step 1: Replace the file contents**

```typescript
import React, { useState } from 'react';
import { BookCollectorSource } from '../api/BookCollectorAPI';

interface BookCollectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceSelected: (source: BookCollectorSource) => void;
}

export function BookCollectorModal({ isOpen, onClose, onSourceSelected }: BookCollectorModalProps) {
    const [selectedSource, setSelectedSource] = useState<BookCollectorSource>('guy_books');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Select Book Source</h2>
                <div className="modal-select">
                    <select
                        onChange={(e) => setSelectedSource(e.target.value as BookCollectorSource)}
                        value={selectedSource}
                    >
                        <option value="guy_books">Guy Books</option>
                    </select>
                    <button
                        className="load-button"
                        onClick={() => onSourceSelected(selectedSource)}
                    >
                        Load Books
                    </button>
                </div>
                <button className="close-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add site/src/components/BookCollectorModal.tsx
git commit -m "refactor: remove paginated fetch option from BookCollectorModal"
```

---

### Task 5: Update `BookshelfViewer.tsx`

**Files:**
- Modify: `site/src/components/BookshelfViewer.tsx`

Three changes:
1. Remove the `config` import (no longer used)
2. Update `BookCollectorAPI` import: use named `fetchBooks` instead of `BookCollectorAPI` class
3. Update `handleBookCollectorSource`: remove the `method` parameter and the paginated branch

**Step 1: Update the import lines at the top**

Find:
```typescript
import { config } from '../config';
import { BookCollectorAPI, BookPDFSource, BookCollectorSource } from '../api/BookCollectorAPI';
```

Replace with:
```typescript
import { fetchBooks, BookPDFSource, BookCollectorSource } from '../api/BookCollectorAPI';
```

**Step 2: Update `handleBookCollectorSource`**

Find:
```typescript
const handleBookCollectorSource = async (source: BookCollectorSource, method: BookFetchingMethod) => {
    setShowBookCollectorModal(false);
    try {
        if (method === 'all') {
            const bookSources = await BookCollectorAPI.fetchBooks(source);
            const pdfResources = bookSources.map(s => createPDFResource(s.pdf_path));
            await handlePDFSourcesSubmitted(pdfResources);
        } else {
            const iterator = await BookCollectorAPI.createPaginatedBooks(source);
            (async () => {
                try {
                    for await (const bookChunk of iterator) {
                        const pdfResources = bookChunk.map(s => createPDFResource(s.pdf_path));
                        await handlePDFSourcesSubmitted(pdfResources);
                    }
                } catch (error) {
                    console.error('Error during paginated book loading:', error);
                }
            })();
        }
    } catch (error) {
        console.error('Failed to fetch books from collector:', error);
    }
};
```

Replace with:
```typescript
const handleBookCollectorSource = async (source: BookCollectorSource) => {
    setShowBookCollectorModal(false);
    try {
        const bookSources = await fetchBooks(source);
        const pdfResources = bookSources.map(s => createPDFResource(s.pdf_path));
        await handlePDFSourcesSubmitted(pdfResources);
    } catch (error) {
        console.error('Failed to fetch books from collector:', error);
    }
};
```

**Step 3: Update the `BookCollectorModal` JSX prop**

Find:
```typescript
import { BookCollectorModal, BookFetchingMethod } from './BookCollectorModal';
```
Replace with:
```typescript
import { BookCollectorModal } from './BookCollectorModal';
```

Also find the JSX usage of `onSourceSelected` — it should now pass `handleBookCollectorSource` directly with no method argument (the signature already matches after step 2).

**Step 4: Verify no TypeScript errors**

```bash
cd site && npx tsc --noEmit
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add site/src/components/BookshelfViewer.tsx
git commit -m "refactor: update BookshelfViewer to use new fetchBooks function"
```

---

### Task 6: Delete the Rust backend and docker-compose

**Files:**
- Delete: `book_collector/` (entire directory)
- Delete: `docker-compose.yml`

**Step 1: Delete the files**

```bash
rm -rf book_collector
rm docker-compose.yml
```

**Step 2: Verify the frontend still type-checks and builds**

```bash
cd site && npx tsc --noEmit && npm run build
```

Expected: clean build with no errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Rust book_collector service and docker-compose"
```

---

### Task 7: Smoke test in the browser

**Step 1: Start the dev server**

```bash
cd site && npm run dev
```

**Step 2: Open the app**

Navigate to `http://localhost:5173` (or whatever port Vite prints).

**Step 3: Test the golden path**

1. Click **"Load from Collector"**
2. Select **"Guy Books"**, click **"Load Books"**
3. Verify books appear on the shelf

Expected: books load from the GitHub repo without any backend running.

**Step 4: Final commit if any fixes were needed, then done**
