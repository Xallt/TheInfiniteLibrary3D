import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BookData } from "../../types/BookData";
import { Book, getBookOuterSize } from "./Book";
import { BookComponent } from "./BookMesh";
import { Bookshelf, BookshelfParams } from "./Bookshelf";

interface BookshelfMeshProps {
  params: BookshelfParams;
  texturePath: string;
  books: BookData[];
  onBooksChanged: (books: Book[]) => void;
  onMeshReady: (mesh: THREE.Mesh) => void;
}

export function BookshelfMesh({
  params,
  texturePath,
  books,
  onBooksChanged,
  onMeshReady,
}: BookshelfMeshProps) {
  const bookshelfRef = useRef<Bookshelf | null>(null);
  if (!bookshelfRef.current) {
    bookshelfRef.current = new Bookshelf(params, texturePath);
    const outerSize = bookshelfRef.current.getOuterSize();
    const sceneElevation = 0.5;
    bookshelfRef.current
      .getMesh()
      .position.set(-outerSize.x / 2, outerSize.y / 2 + sceneElevation, 0);
  }
  const bookshelf = bookshelfRef.current;
  const bookInstancesRef = useRef<(Book | null)[]>([]);

  useEffect(() => {
    onMeshReady(bookshelf.getMesh());
  }, []);

  const positions = bookshelf.computePositions(books.map((b) => getBookOuterSize(b.params)));

  const syncBooks = () => {
    onBooksChanged(bookInstancesRef.current.filter((b): b is Book => b !== null));
  };

  return (
    <primitive object={bookshelf.getMesh()}>
      {books.map(
        (b, i) =>
          positions[i] && (
            <BookComponent
              key={b.id}
              data={b}
              position={positions[i]!}
              onReady={(book) => {
                bookInstancesRef.current[i] = book;
                syncBooks();
              }}
              onUnmount={() => {
                bookInstancesRef.current[i] = null;
                syncBooks();
              }}
            />
          )
      )}
    </primitive>
  );
}
