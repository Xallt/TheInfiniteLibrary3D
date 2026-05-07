import { useEffect, useRef, useState } from 'react';
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

class BookResourceMapping {
    book: Book;
    source: PDFResource;
    loaded: boolean;
    index: number;

    constructor(book: Book, source: PDFResource, loaded: boolean = false, index: number) {
        this.book = book;
        this.source = source;
        this.loaded = loaded;
        this.index = index;
    }
}

export function BookshelfViewer() {
    const sceneRef = useRef<MainScene | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const bookResourceMappingsRef = useRef<{ [index: number]: BookResourceMapping }>({});
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [currentViewingBookIndex, setCurrentViewingBookIndex] = useState(-1);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [showBookCollectorModal, setShowBookCollectorModal] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        if (sceneRef.current) {
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) canvas.remove();
            const stats = containerRef.current.querySelector('.stats');
            if (stats) stats.remove();
        }

        sceneRef.current = new MainScene(containerRef.current, defaultBookshelfParams);

        sceneRef.current.setOnBookSelectedCallback((bookIndex) => {
            handleViewBook(bookIndex);
        });

        return () => {
            if (sceneRef.current && containerRef.current) {
                const canvas = containerRef.current.querySelector('canvas');
                if (canvas) canvas.remove();
                const stats = containerRef.current.querySelector('.stats');
                if (stats) stats.remove();
            }
        };
    }, []);

    const returnBook = () => {
        if (!sceneRef.current) return;
        sceneRef.current.returnBookToShelf();
        setIsViewingBook(false);
        setCurrentViewingBookIndex(-1);
    };

    const handleViewBook = async (bookIndex: number) => {
        if (!sceneRef.current) return;

        if (isViewingBook) {
            throw new Error("Book already in view");
        }

        setCurrentViewingBookIndex(bookIndex);

        const currentBookResource = bookResourceMappingsRef.current[bookIndex];
        if (!currentBookResource) {
            throw new Error("Book not found");
        }

        sceneRef.current.viewBook(bookIndex);

        setIsViewingBook(true);

        if (!currentBookResource.loaded) {
            await loadBookPages(currentBookResource);
        } else {
            console.log("Book already loaded");
        }
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        const bookPromises = sources.map(async (resource, index) => {
            try {
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load(defaultBookTexture.path),
                    defaultBookTexture.coverPositions
                ), 1, index);

                if (sceneRef.current) {
                    sceneRef.current.addBook(book);
                }

                return new BookResourceMapping(book, resource, false, index);
            } catch (error) {
                console.error(`Failed to load PDF from ${resource.getDisplayName()}:`, error);
                return null;
            }
        });

        const results = (await Promise.all(bookPromises)).filter((result): result is BookResourceMapping => result !== null);
        const resultsSorted = results.sort((a, b) => a.index - b.index);

        const offset_index = Object.keys(bookResourceMappingsRef.current).length;
        const newMappings = resultsSorted.reduce((acc, mapping) => {
            acc[mapping.index + offset_index] = mapping;
            return acc;
        }, { ...bookResourceMappingsRef.current } as { [index: number]: BookResourceMapping });

        bookResourceMappingsRef.current = newMappings;
    };

    const loadBookPages = async (bookResourceMapping: BookResourceMapping) => {
        try {
            const parseResult = await bookResourceMapping.source.getParsedPDF({
                imageFormat: 'png',
                scale: 2.0
            });

            const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
            bookResourceMapping.book.resizePageArray(actualPageCount);

            let pageIndex = 0;
            for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
                const physicalPage = Page.fromPdfPages(
                    frontPage,
                    backPage,
                    Page.getPageParams(bookResourceMapping.book.getParams())
                );
                bookResourceMapping.book.addPage(physicalPage, pageIndex++);
            }

            bookResourceMappingsRef.current = {
                ...bookResourceMappingsRef.current,
                [bookResourceMapping.index]: { ...bookResourceMapping, loaded: true }
            };
        } catch (error) {
            console.error('Failed to load book pages:', error);
        }
    };

    useEffect(() => {
        if (sceneRef.current) {
            const handleVRSessionStart = () => {
            };

            if (sceneRef.current.isInVR()) {
                sceneRef.current.onVRSessionStart(handleVRSessionStart);
                sceneRef.current.onVRSessionEnd(() => { });
            }

            return () => {
                if (sceneRef.current) sceneRef.current.removeVRSessionListeners();
            };
        }
    }, [isViewingBook]);

    const getCurrentBookInfo = (): { title: string; author: string; pageCount: number } | null => {
        const resource = bookResourceMappingsRef.current[currentViewingBookIndex];
        if (!resource || !resource.source.getMetadata()) return null;

        const metadata = resource.source.getMetadata();
        return {
            title: metadata?.title || 'Untitled',
            author: metadata?.author || 'Unknown Author',
            pageCount: metadata?.numPages || 0
        };
    };

    const handleDownloadScene = async () => {
        if (!sceneRef.current) return;

        try {
            const blob = await sceneRef.current.exportSceneToGLB();
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

    const bookInfo = getCurrentBookInfo();

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
                    book={sceneRef.current?.getBook(currentViewingBookIndex)!}
                    controllers={sceneRef.current?.getControllers() || []}
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
