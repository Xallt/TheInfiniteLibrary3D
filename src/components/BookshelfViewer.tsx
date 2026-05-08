import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { BookCollectorSource, fetchBooks } from "../api/BookCollectorAPI";
import { defaultBookParams, defaultBookTexture } from "../config/bookConfig";
import { BookshelfSceneInner } from "../scenes/BookshelfSceneInner";
import { MainScene } from "../scenes/MainScene";
import { BookData } from "../types/BookData";
import { PDFResource, createPDFResource } from "../types/PDFResource";
import { BookCollectorModal } from "./BookCollectorModal";
import { TextureLoader } from "./Bookshelf/Book";
import { BookTexture } from "./Bookshelf/BookTexture";
import { BookStateControlsUI } from "./BookStateControlsUI";
import { PDFSelectionModal } from "./PDFSelectionModal";

export function BookshelfViewer() {
  const mainSceneRef = useRef<MainScene>(null);
  const [books, setBooks] = useState<BookData[]>([]);
  const [viewingBookIndex, setViewingBookIndex] = useState<number | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showBookCollectorModal, setShowBookCollectorModal] = useState(false);

  function returnBook() {
    if (!mainSceneRef.current) return;
    mainSceneRef.current.actions.returnBookToShelf();
    setViewingBookIndex(null);
  }

  async function handleViewBook(bookIndex: number) {
    if (viewingBookIndex !== null) throw new Error("Book already in view");
    setViewingBookIndex(bookIndex);
    if (!mainSceneRef.current) return;
    mainSceneRef.current.actions.viewBook(bookIndex);
    setBooks((prev) => prev.map((b, i) => (i === bookIndex ? { ...b, loadPages: true } : b)));
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
    } catch (error) {
      console.error("Failed to fetch books from collector:", error);
    }
  }

  function getCurrentBookInfo() {
    if (viewingBookIndex === null) return null;
    const book = books[viewingBookIndex];
    if (!book) return null;
    const metadata = book.pdfResource.getMetadata();
    if (!metadata) return null;
    return {
      title: metadata.title || "Untitled",
      author: metadata.author || "Unknown Author",
      pageCount: metadata.numPages || 0,
    };
  }

  const bookInfo = getCurrentBookInfo();

  const currentBook = (() => {
    if (viewingBookIndex === null || !mainSceneRef.current) return null;
    try {
      return mainSceneRef.current.actions.getBook(viewingBookIndex);
    } catch {
      return null;
    }
  })();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas gl={{ antialias: true, alpha: true }} flat>
        <BookshelfSceneInner
          onMainSceneReady={(mainScene) => {
            mainSceneRef.current = mainScene;
            mainScene.actions.setOnBookSelectedCallback(handleViewBook);
          }}
          books={books}
        />
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

      {currentBook && <BookStateControlsUI book={currentBook} />}

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
