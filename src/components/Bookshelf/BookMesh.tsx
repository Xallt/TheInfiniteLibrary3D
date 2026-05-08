import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BookData } from '../../types/BookData';
import { Book, buildEmptyBook } from './Book';
import { fromPdfPages, getPageParams } from './Page';

interface BookMeshProps {
    data: BookData;
    position: THREE.Vector3;
    onReady: (book: Book) => void;
    onUnmount: () => void;
}

export function BookMesh({ data, position, onReady, onUnmount }: BookMeshProps) {
    const bookRef = useRef<Book | null>(null);

    if (!bookRef.current) {
        bookRef.current = buildEmptyBook(data.params, data.texture, 1, 0);
        bookRef.current.state.mesh.position.copy(position);
        bookRef.current.state.mesh.rotateY(Math.PI);
    }

    useEffect(() => {
        onReady(bookRef.current!);
        return () => onUnmount();
    }, []);

    useEffect(() => {
        if (!data.loadPages || !bookRef.current) return;
        const book = bookRef.current;
        let cancelled = false;

        (async () => {
            try {
                const parseResult = await data.pdfResource.getParsedPDF({ imageFormat: 'png', scale: 2.0 });
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
                console.error('Failed to load book pages:', error);
            }
        })();

        return () => { cancelled = true; };
    }, [data.loadPages]);

    return <primitive object={bookRef.current.state.mesh} />;
}