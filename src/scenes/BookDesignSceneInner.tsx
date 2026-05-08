import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Book, BookMeshParams, buildEmptyBook } from '../components/Bookshelf/Book';
import { BookTexture } from '../components/Bookshelf/BookTexture';
import { fromPdfPages, getPageParams } from '../components/Bookshelf/Page';
import { PDFResource } from '../types/PDFResource';

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
            scene.remove(book.state.mesh);
        });
        booksRef.current = [];

        bookTextures.forEach(async (texture, index) => {
            const book = buildEmptyBook(bookParams, texture, 1, index);
            const bookMesh = book.state.mesh;
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
                    book.actions.resizePageArray(actualPageCount);

                    let pageIndex = 0;
                    for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
                        const physicalPage = fromPdfPages(
                            frontPage,
                            backPage,
                            getPageParams(book.state.params)
                        );
                        book.actions.addPage(physicalPage, pageIndex++);
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
