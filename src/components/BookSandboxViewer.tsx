import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { defaultBookParams, defaultBookTexture } from "../config/bookConfig";
import { BookSandboxSceneInner } from "../scenes/BookSandboxSceneInner";
import { BookData } from "../types/BookData";
import { PDFResource, URLPDFResource } from "../types/PDFResource";
import { BookSandboxControls } from "./BookSandboxControls";
import {
  BookMeshParams,
  BookOpeningState,
  buildPageSelectedState,
  TextureLoader,
} from "./Bookshelf/Book";
import { BookTexture } from "./Bookshelf/BookTexture";
import { useBookPages } from "./Bookshelf/useBookPages";

const DEFAULT_PDF_URL = "https://arxiv.org/pdf/1706.03762";

export function BookSandboxViewer() {
  const [bookParams, setBookParams] = useState<BookMeshParams>(defaultBookParams);
  const [openingState, setOpeningState] = useState<BookOpeningState>(buildPageSelectedState(0));
  const [pdfResource, setPdfResource] = useState<PDFResource | null>(
    () => new URLPDFResource(DEFAULT_PDF_URL)
  );
  const [bookId, setBookId] = useState(() => crypto.randomUUID());

  const texture = new BookTexture(
    TextureLoader.getInstance().load(defaultBookTexture.path),
    defaultBookTexture.coverPositions
  );

  const bookData: BookData = pdfResource
    ? { id: bookId, pdfResource, texture, params: bookParams, loadPages: true }
    : {
        id: bookId,
        pdfResource: new URLPDFResource(""),
        texture,
        params: bookParams,
        loadPages: false,
      };

  const pages = useBookPages(bookData, pdfResource !== null);

  function handlePdfResourceChange(r: PDFResource | null) {
    setPdfResource(r);
    setBookId(crypto.randomUUID());
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Canvas gl={{ antialias: true, alpha: true }} flat>
        <BookSandboxSceneInner
          params={bookParams}
          texture={texture}
          pages={pages}
          openingState={openingState}
        />
      </Canvas>

      <BookSandboxControls
        bookParams={bookParams}
        openingState={openingState}
        numPages={pages.length}
        pdfResource={pdfResource}
        onBookParamsChange={setBookParams}
        onOpeningStateChange={setOpeningState}
        onPdfResourceChange={handlePdfResourceChange}
      />
    </div>
  );
}
