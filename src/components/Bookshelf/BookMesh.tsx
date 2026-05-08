import { useEffect, useState } from "react";
import * as THREE from "three";
import { BookData } from "../../types/BookData";
import { PdfParseResult } from "../../utils/pdfParser";
import { Book, buildUniformlyOpenedState, useBook } from "./Book";
import { fromPdfPages, getPageParams } from "./Page";
import { PageGroup, usePageGroup } from "./PageGroup";

interface BookComponentProps {
  data: BookData;
  position: THREE.Vector3;
  onReady: (book: Book) => void;
  onUnmount: () => void;
}

export function BookComponent({ data, position, onReady, onUnmount }: BookComponentProps) {
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

  const [parseResult, setParseResult] = useState<PdfParseResult | null>(null);

  useEffect(() => {
    if (!data.loadPages) return;
    (async () => {
      const result = await data.pdfResource.getParsedPDF({ imageFormat: "png", scale: 2.0 });
      setParseResult(result);
    })();
  }, [data.pdfResource, data.loadPages]);

  return (
    <BookMesh
      book={book}
      loadPages={data.loadPages}
      pageGroup={pageGroup}
      parseResult={parseResult}
    />
  );
}

export function BookMesh({
  book,
  loadPages,
  pageGroup,
  parseResult,
}: {
  book: Book;
  loadPages: boolean;
  pageGroup: PageGroup;
  parseResult: PdfParseResult | null;
}) {
  useEffect(() => {
    if (!loadPages || !parseResult) return;

    (async () => {
      const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
      book.actions.resizePageArray(actualPageCount);
      let pageIndex = 0;
      for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
        const physicalPage = fromPdfPages(frontPage, backPage, getPageParams(book.state.params));
        book.actions.addPage(physicalPage, pageIndex++);
      }
    })();
  }, [loadPages, parseResult]);

  return (
    <primitive object={book.state.mesh}>
      {pageGroup.pageEntries.map(
        (entry) => entry && <primitive key={entry.id} object={entry.mesh} />
      )}
    </primitive>
  );
}
