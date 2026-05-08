import { Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Book, BookMeshParams } from "../components/Bookshelf/Book";
import { BookTexture } from "../components/Bookshelf/BookTexture";
import { BookStateControlsUI } from "../components/BookStateControlsUI";
import { PDFResource } from "../types/PDFResource";
import { BookDesignSceneInner } from "./BookDesignSceneInner";

interface BookDesignSceneProps {
  bookTextures: BookTexture[];
  bookParams: BookMeshParams;
  pdfResource: PDFResource | null;
}

export function BookDesignScene({ bookTextures, bookParams, pdfResource }: BookDesignSceneProps) {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#f0f0f0" }}>
      <Canvas camera={{ position: [0, 0, 2], fov: 75 }} gl={{ antialias: true }}>
        <Stats />
        <BookDesignSceneInner
          bookTextures={bookTextures}
          bookParams={bookParams}
          pdfResource={pdfResource}
          onBookReady={setCurrentBook}
        />
      </Canvas>
      {currentBook && (
        <div className="book-controls-overlay">
          <BookStateControlsUI book={currentBook} />
        </div>
      )}
    </div>
  );
}
