import { useRef } from "react";
import * as THREE from "three";
import { BookData } from "../../types/BookData";
import { BookOpeningState, getBookOuterSize } from "./Book";
import { Book, BookPageInput } from "./BookComponent";
import { Bookshelf, BookshelfParams } from "./Bookshelf";

export interface BookshelfMeshProps {
  params: BookshelfParams;
  texturePath: string;
  books: BookData[];
  pagesByBook: Record<string, BookPageInput[]>;
  selectedBookIndex: number | null;
  viewingBookIndex: number | null;
  viewingOpeningState: BookOpeningState;
  onBookHover: (index: number | null) => void;
  onBookClick: (index: number) => void;
  viewCenter: THREE.Vector3;
  viewRotation: THREE.Euler;
  shelfRotation: THREE.Euler;
  hoverPerk: number;
}

export function BookshelfMesh({
  params,
  texturePath,
  books,
  pagesByBook,
  selectedBookIndex,
  viewingBookIndex,
  viewingOpeningState,
  onBookHover,
  onBookClick,
  viewCenter,
  viewRotation,
  shelfRotation,
  hoverPerk,
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

  const positions = bookshelf.computePositions(books.map((b) => getBookOuterSize(b.params)));
  const shelfMesh = bookshelf.getMesh();
  const shelfWorldPos = shelfMesh.position;

  return (
    <>
      <primitive object={shelfMesh} />
      {books.map((b, i) => {
        const slot = positions[i];
        if (!slot) return null;
        const isViewing = viewingBookIndex === i;
        const isSelected = selectedBookIndex === i && !isViewing;
        const worldPosition = isViewing
          ? viewCenter
          : new THREE.Vector3(
              slot.x + shelfWorldPos.x,
              slot.y + shelfWorldPos.y,
              slot.z + shelfWorldPos.z
            );
        const worldRotation = isViewing ? viewRotation : shelfRotation;
        const openingState = isViewing ? viewingOpeningState : undefined;
        const pages = pagesByBook[b.id] ?? [];

        return (
          <Book
            key={b.id}
            id={b.id}
            params={b.params}
            texture={b.texture}
            pages={pages}
            openingState={openingState}
            worldPosition={worldPosition}
            worldRotation={worldRotation}
            hoverOffset={isSelected ? hoverPerk : 0}
            onPointerOver={() => viewingBookIndex === null && onBookHover(i)}
            onPointerOut={() => onBookHover(null)}
            onClick={() => viewingBookIndex === null && onBookClick(i)}
          />
        );
      })}
    </>
  );
}
