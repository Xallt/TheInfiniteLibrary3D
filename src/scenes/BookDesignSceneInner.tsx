import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Book, BookMeshParams } from '../components/Bookshelf/Book';
import { BookTexture } from '../components/Bookshelf/BookTexture';
import { PDFResource } from '../types/PDFResource';
import { Page } from '../components/Bookshelf/Page';

interface BookDesignSceneInnerProps {
    bookTextures: BookTexture[];
    bookParams: BookMeshParams;
    pdfResource: PDFResource | null;
    onBookReady: (book: Book) => void;
}

export function BookDesignSceneInner({
    bookTextures,
    bookParams,
    pdfResource,
    onBookReady,
}: BookDesignSceneInnerProps) {
    const { scene } = useThree();
    const booksRef = useRef<Book[]>([]);
    const loadedPdfRef = useRef<PDFResource | null>(null);

    useEffect(() => {
        booksRef.current.forEach(book => {
            scene.remove(book.getMesh());
        });
        booksRef.current = [];

        bookTextures.forEach(async (texture, index) => {
            const book = Book.empty(bookParams, texture, 1, index);
            const bookMesh = book.getMesh();
            bookMesh.position.set(
                index * 0.5 - (bookTextures.length - 1) * 0.25,
                0,
                0
            );
            scene.add(bookMesh);
            booksRef.current.push(book);

            if (index === 0) {
                onBookReady(book);
            }

            if (pdfResource && pdfResource !== loadedPdfRef.current) {
                try {
                    const parseResult = await pdfResource.getParsedPDF({
                        imageFormat: 'png',
                        scale: 2.0,
                    });
                    const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
                    book.resizePageArray(actualPageCount);

                    let pageIndex = 0;
                    for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
                        const physicalPage = Page.fromPdfPages(
                            frontPage,
                            backPage,
                            Page.getPageParams(book.getParams())
                        );
                        book.addPage(physicalPage, pageIndex++);
                    }
                    loadedPdfRef.current = pdfResource;
                } catch (error) {
                    console.error('Failed to load book pages:', error);
                }
            }
        });
    }, [bookTextures, bookParams, pdfResource]);

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[1, 1, 1]} intensity={0.8} />
            <gridHelper args={[2, 20]} />
            <OrbitControls enableDamping dampingFactor={0.05} />
        </>
    );
}
