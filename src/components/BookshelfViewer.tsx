import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { BookCollectorSource, fetchBooks } from "../api/BookCollectorAPI";
import { defaultBookParams, defaultBookTexture } from "../config/bookConfig";
import { BookshelfSceneInner } from "../scenes/BookshelfSceneInner";
import { BookData } from "../types/BookData";
import { PDFResource, createPDFResource } from "../types/PDFResource";
import { BookCollectorModal } from "./BookCollectorModal";
import { BookOpeningState, buildUniformlyOpenedState, TextureLoader } from "./Bookshelf/Book";
import { BookTexture } from "./Bookshelf/BookTexture";
import { BookPageInput } from "./Bookshelf/BookComponent";
import { useBookPages } from "./Bookshelf/useBookPages";
import { BookStateControlsViewerUI } from "./BookStateControlsUI";
import { PDFSelectionModal } from "./PDFSelectionModal";

function BookPageBridge({
  book,
  enabled,
  onPagesChanged,
}: {
  book: BookData;
  enabled: boolean;
  onPagesChanged: (id: string, pages: BookPageInput[]) => void;
}) {
  const pages = useBookPages(book, enabled);
  onPagesChanged(book.id, pages);
  return null;
}

export function BookshelfViewer() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loadFlags, setLoadFlags] = useState<Record<string, boolean>>({});
  const [pagesByBook, setPagesByBook] = useState<Record<string, BookPageInput[]>>({});
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(null);
  const [viewingBookIndex, setViewingBookIndex] = useState<number | null>(null);
  const [viewingOpeningState, setViewingOpeningState] = useState<BookOpeningState>(
    buildUniformlyOpenedState(0)
  );
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showBookCollectorModal, setShowBookCollectorModal] = useState(false);

  function returnBook() {
    setViewingBookIndex(null);
    setViewingOpeningState(buildUniformlyOpenedState(0));
  }

  function handleViewBook(bookIndex: number) {
    if (viewingBookIndex !== null) return;
    setViewingBookIndex(bookIndex);
    setViewingOpeningState(buildUniformlyOpenedState(Math.PI / 2));
    const id = books[bookIndex].id;
    setLoadFlags((prev) => ({ ...prev, [id]: true }));
  }

  async function handlePDFSourcesSubmitted(sources: PDFResource[]) {
    const offset = books.length;
    const newBooks: BookData[] = sources.map((resource, i) => ({
      id: `book-${Date.now()}-${offset + i}`,
      pdfResource: resource,
      texture: new BookTexture(
        TextureLoader.getInstance().load(defaultBookTexture.path),
        defaultBookTexture.coverPositions
      ),
      params: defaultBookParams,
      loadPages: false,
    }));
    setBooks((prev) => [...prev, ...newBooks]);
  }

  async function handleBookCollectorSource(source: BookCollectorSource) {
    setShowBookCollectorModal(false);
    try {
      const bookSources = await fetchBooks(source);
      const pdfResources = bookSources.map((s) => createPDFResource(s.pdf_path));
      await handlePDFSourcesSubmitted(pdfResources);
    } catch (e) {
      console.error("Failed to fetch books from collector:", e);
    }
  }

  function getCurrentBookInfo() {
    if (viewingBookIndex === null) return null;
    const book = books[viewingBookIndex];
    if (!book) return null;
    const m = book.pdfResource.getMetadata();
    if (!m) return null;
    return {
      title: m.title || "Untitled",
      author: m.author || "Unknown Author",
      pageCount: m.numPages || 0,
    };
  }

  const bookInfo = getCurrentBookInfo();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas gl={{ antialias: true, alpha: true }} flat>
        <BookshelfSceneInner
          books={books}
          pagesByBook={pagesByBook}
          selectedBookIndex={selectedBookIndex}
          viewingBookIndex={viewingBookIndex}
          viewingOpeningState={viewingOpeningState}
          onBookHover={setSelectedBookIndex}
          onBookClick={handleViewBook}
        />
        {books.map((b) => (
          <BookPageBridge
            key={b.id}
            book={b}
            enabled={!!loadFlags[b.id]}
            onPagesChanged={(id, pages) =>
              setPagesByBook((prev) => (prev[id] === pages ? prev : { ...prev, [id]: pages }))
            }
          />
        ))}
      </Canvas>

      <div className="controls-panel panel">
        <button className="panel-btn" onClick={() => setShowUrlModal(true)}>
          Add Books
        </button>
        <button className="panel-btn" onClick={() => setShowBookCollectorModal(true)}>
          Load from Collector
        </button>
        {viewingBookIndex !== null && (
          <>
            <hr className="panel-divider" />
            <button className="panel-btn" onClick={returnBook}>
              Return Book
            </button>
            {bookInfo && (
              <>
                <span className="panel-label">Now viewing</span>
                <span className="panel-text">{bookInfo.title}</span>
                <span className="panel-text" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {bookInfo.author} · {bookInfo.pageCount}p
                </span>
              </>
            )}
          </>
        )}
      </div>

      {viewingBookIndex !== null && (
        <BookStateControlsViewerUI
          openingState={viewingOpeningState}
          numPages={pagesByBook[books[viewingBookIndex].id]?.length ?? 0}
          onChange={setViewingOpeningState}
        />
      )}

      <PDFSelectionModal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        onPDFSourcesSubmitted={handlePDFSourcesSubmitted}
        initialURLs={["https://arxiv.org/pdf/1706.03762"]}
      />
      <BookCollectorModal
        isOpen={showBookCollectorModal}
        onClose={() => setShowBookCollectorModal(false)}
        onSourceSelected={handleBookCollectorSource}
      />
    </div>
  );
}
