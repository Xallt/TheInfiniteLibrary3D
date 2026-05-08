import { useEffect } from "react";
import * as THREE from "three";
import { BookData } from "../../types/BookData";
import { Book, buildUniformlyOpenedState, useBook } from "./Book";
import { fromPdfPages, getPageParams } from "./Page";
import { usePageGroup } from "./PageGroup";

interface BookMeshProps {
  data: BookData;
  position: THREE.Vector3;
  onReady: (book: Book) => void;
  onUnmount: () => void;
}

export function BookMesh({ data, position, onReady, onUnmount }: BookMeshProps) {
  const rotation = new THREE.Euler(0, Math.PI, 0);
  const numPagesInitial = 1;
  const pageGroup = usePageGroup(numPagesInitial);
  const book = useBook(
    data.params,
    data.texture,
    pageGroup,
    buildUniformlyOpenedState(),
    0,
    position,
    rotation
  );

  useEffect(() => {
    onReady(book);
    return () => onUnmount();
  }, []);

  useEffect(() => {
    if (!data.loadPages) return;
    let cancelled = false;

    (async () => {
      try {
        const parseResult = await data.pdfResource.getParsedPDF({ imageFormat: "png", scale: 2.0 });
        if (cancelled) return;
        const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
        book.actions.resizePageArray(actualPageCount);
        let pageIndex = 0;
        for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
          if (cancelled) return;
          const physicalPage = fromPdfPages(frontPage, backPage, getPageParams(book.state.params));
          book.actions.addPage(physicalPage, pageIndex++);
        }
      } catch (error) {
        console.error("Failed to load book pages:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.loadPages]);

  return (
    <primitive object={book.state.mesh}>
      {pageGroup.pageEntries.map(
        (entry) => entry && <primitive key={entry.id} object={entry.mesh} />
      )}
    </primitive>
  );
}
