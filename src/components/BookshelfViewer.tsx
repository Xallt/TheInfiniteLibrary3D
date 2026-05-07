import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { BookCollectorSource, fetchBooks } from '../api/BookCollectorAPI';
import { defaultBookParams, defaultBookTexture, defaultBookshelfParams } from '../config/bookConfig';
import { MainScene } from '../scenes/MainScene';
import { PDFResource, createPDFResource } from '../types/PDFResource';
import { BookCollectorModal } from './BookCollectorModal';
import { Book, TextureLoader } from './Bookshelf/Book';
import { BookTexture } from './Bookshelf/BookTexture';
import { Page } from './Bookshelf/Page';
import { BookStateControlsUI } from './BookStateControlsUI';
import { PDFSelectionModal } from './PDFSelectionModal';
import { BookshelfSceneInner } from '../scenes/BookshelfSceneInner';

const xrStore = createXRStore();

class BookResourceMapping {
    constructor(
        public book: Book,
        public source: PDFResource,
        public loaded: boolean = false,
        public index: number
    ) {}
}

export function BookshelfViewer() {
    const mainScene = useMemo(() => new MainScene(defaultBookshelfParams), []);
    const bookResourceMappingsRef = useRef<{ [index: number]: BookResourceMapping }>({});
    const [isVRSupported, setIsVRSupported] = useState(false);
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [currentViewingBookIndex, setCurrentViewingBookIndex] = useState(-1);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [showBookCollectorModal, setShowBookCollectorModal] = useState(false);

    useEffect(() => {
        if (!('xr' in navigator) || !navigator.xr) return;
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
            setIsVRSupported(supported);
        }).catch(() => setIsVRSupported(false));
    }, []);

    useEffect(() => {
        mainScene.setOnBookSelectedCallback((bookIndex) => {
            handleViewBook(bookIndex);
        });
    }, [mainScene]);

    const returnBook = () => {
        mainScene.returnBookToShelf();
        setIsViewingBook(false);
        setCurrentViewingBookIndex(-1);
    };

    const handleViewBook = async (bookIndex: number) => {
        if (isViewingBook) throw new Error('Book already in view');
        setCurrentViewingBookIndex(bookIndex);
        const currentBookResource = bookResourceMappingsRef.current[bookIndex];
        if (!currentBookResource) throw new Error('Book not found');
        mainScene.viewBook(bookIndex);
        setIsViewingBook(true);
        if (!currentBookResource.loaded) {
            await loadBookPages(currentBookResource);
        }
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        const bookPromises = sources.map(async (resource, index) => {
            try {
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load(defaultBookTexture.path),
                    defaultBookTexture.coverPositions
                ), 1, index);
                mainScene.addBook(book);
                return new BookResourceMapping(book, resource, false, index);
            } catch (error) {
                console.error(`Failed to load PDF from ${resource.getDisplayName()}:`, error);
                return null;
            }
        });
        const results = (await Promise.all(bookPromises)).filter((r): r is BookResourceMapping => r !== null);
        const sorted = results.sort((a, b) => a.index - b.index);
        const offset = Object.keys(bookResourceMappingsRef.current).length;
        bookResourceMappingsRef.current = sorted.reduce((acc, m) => {
            acc[m.index + offset] = m;
            return acc;
        }, { ...bookResourceMappingsRef.current } as { [index: number]: BookResourceMapping });
    };

    const loadBookPages = async (mapping: BookResourceMapping) => {
        try {
            const parseResult = await mapping.source.getParsedPDF({ imageFormat: 'png', scale: 2.0 });
            const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
            mapping.book.resizePageArray(actualPageCount);
            let pageIndex = 0;
            for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
                const physicalPage = Page.fromPdfPages(frontPage, backPage, Page.getPageParams(mapping.book.getParams()));
                mapping.book.addPage(physicalPage, pageIndex++);
            }
            bookResourceMappingsRef.current = {
                ...bookResourceMappingsRef.current,
                [mapping.index]: { ...mapping, loaded: true }
            };
        } catch (error) {
            console.error('Failed to load book pages:', error);
        }
    };

    const handleDownloadScene = async () => {
        try {
            const blob = await mainScene.exportSceneToGLB();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'bookshelf-scene.glb';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Failed to export scene:', error);
        }
    };

    const handleBookCollectorSource = async (source: BookCollectorSource) => {
        setShowBookCollectorModal(false);
        try {
            const bookSources = await fetchBooks(source);
            const pdfResources = bookSources.map(s => createPDFResource(s.pdf_path));
            await handlePDFSourcesSubmitted(pdfResources);
        } catch (error) {
            console.error('Failed to fetch books from collector:', error);
        }
    };

    const getCurrentBookInfo = () => {
        const resource = bookResourceMappingsRef.current[currentViewingBookIndex];
        if (!resource || !resource.source.getMetadata()) return null;
        const metadata = resource.source.getMetadata();
        return {
            title: metadata?.title || 'Untitled',
            author: metadata?.author || 'Unknown Author',
            pageCount: metadata?.numPages || 0,
        };
    };

    const bookInfo = getCurrentBookInfo();

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <Canvas gl={{ antialias: true, alpha: true }} flat>
                {isVRSupported ? (
                    <XR store={xrStore}>
                        <BookshelfSceneInner mainScene={mainScene} isVRSupported={isVRSupported} />
                    </XR>
                ) : (
                    <BookshelfSceneInner mainScene={mainScene} isVRSupported={isVRSupported} />
                )}
            </Canvas>

            <div className="controls-panel panel">
                <button className="panel-btn" onClick={handleDownloadScene}>Download Scene</button>
                <button className="panel-btn" onClick={() => setShowUrlModal(true)}>Add Books</button>
                <button className="panel-btn" onClick={() => setShowBookCollectorModal(true)}>Load from Collector</button>
                {isViewingBook && (
                    <>
                        <hr className="panel-divider" />
                        <button className="panel-btn" onClick={returnBook}>Return Book</button>
                        {bookInfo && (
                            <>
                                <span className="panel-label">Now viewing</span>
                                <span className="panel-text">{bookInfo.title}</span>
                                <span className="panel-text" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {bookInfo.author} · {bookInfo.pageCount}p
                                </span>
                            </>
                        )}
                    </>
                )}
            </div>

            {isViewingBook && (
                <BookStateControlsUI
                    book={mainScene.getBook(currentViewingBookIndex)!}
                    controllers={mainScene.getControllers()}
                />
            )}

            <PDFSelectionModal
                isOpen={showUrlModal}
                onClose={() => setShowUrlModal(false)}
                onPDFSourcesSubmitted={handlePDFSourcesSubmitted}
                initialURLs={['https://arxiv.org/pdf/1706.03762']}
            />
            <BookCollectorModal
                isOpen={showBookCollectorModal}
                onClose={() => setShowBookCollectorModal(false)}
                onSourceSelected={handleBookCollectorSource}
            />
        </div>
    );
}
