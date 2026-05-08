import { useEffect, useState } from "react";
import { PdfPage } from "../../utils/pdfParser";
import { BookData } from "../../types/BookData";
import { BookPageInput } from "./BookComponent";
import { PageParams, getPageParams } from "./Page";

function buildPageInputFromPdfPair(
  front: PdfPage,
  back: PdfPage | null,
  params: PageParams
): { input: BookPageInput; revoke: () => void } {
  const frontBlob = new Blob([front.imageData], { type: "image/png" });
  const backBlob = back ? new Blob([back.imageData], { type: "image/png" }) : null;
  const frontUrl = URL.createObjectURL(frontBlob);
  const backUrl = backBlob ? URL.createObjectURL(backBlob) : null;
  const id = crypto.randomUUID();
  return {
    input: {
      id,
      params,
      textures: { front: frontUrl, back: backUrl },
    },
    revoke: () => {
      URL.revokeObjectURL(frontUrl);
      if (backUrl) URL.revokeObjectURL(backUrl);
    },
  };
}

export function useBookPages(book: BookData, enabled: boolean): BookPageInput[] {
  const [pages, setPages] = useState<BookPageInput[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const revokers: Array<() => void> = [];
    const pageParams = getPageParams(book.params);

    (async () => {
      const result = await book.pdfResource.getParsedPDF({ imageFormat: "png", scale: 2.0 });
      if (cancelled) return;
      const collected: BookPageInput[] = [];
      for await (const [front, back] of result.getPairedPages()) {
        if (cancelled) return;
        const { input, revoke } = buildPageInputFromPdfPair(front, back, pageParams);
        collected.push(input);
        revokers.push(revoke);
        setPages([...collected]);
      }
    })();

    return () => {
      cancelled = true;
      revokers.forEach((r) => r());
    };
  }, [book.id, enabled]);

  return pages;
}
