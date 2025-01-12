import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookshelfParams, defaultBookParams, defaultBookTexture } from '../config/bookConfig';
import { PdfPage, PdfParser } from '../utils/pdfParser';
import { Book, TextureLoader } from './Bookshelf/Book';
import { BookTexture } from './Bookshelf/BookTexture';
import { Page } from './Bookshelf/Page';
import { BookStateControlsUI } from './BookStateControlsUI';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';
import { PDFSelectionModal } from './PDFSelectionModal';
import { BookCollectorModal, BookFetchingMethod } from './BookCollectorModal';
import { config } from '../config';
import { BookCollectorAPI, BookPDFSource, BookCollectorSource } from '../api/BookCollectorAPI';

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
    const [bookCount, setBookCount] = useState(0);
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [currentViewingBookIndex, setCurrentViewingBookIndex] = useState(-1);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [bookAngle, setBookAngle] = useState(Math.PI / 2); // Default open angle
    const [bookResourceMappings, setBookResourceMappings] = useState<{ [index: number]: BookResourceMapping }>({});
    const [showBookCollectorModal, setShowBookCollectorModal] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up any existing scene
        if (sceneRef.current) {
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) {
                canvas.remove();
            }
            const stats = containerRef.current.querySelector('.stats');
            if (stats) {
                stats.remove();
            }
        }

        // Initialize new scene with default parameters
        sceneRef.current = new MainScene(
            containerRef.current,  // Pass the container element
            defaultBookshelfParams
        );

        // Set up the book selection callback
        sceneRef.current.setOnBookSelectedCallback((bookIndex) => {
            handleViewBook(bookIndex);
        });

        // Cleanup function
        return () => {
            if (sceneRef.current && containerRef.current) {
                const canvas = containerRef.current.querySelector('canvas');
                if (canvas) {
                    canvas.remove();
                }
                const stats = containerRef.current.querySelector('.stats');
                if (stats) {
                    stats.remove();
                }
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    const returnBook = () => {
        if (!sceneRef.current) return;
        sceneRef.current.returnBookToShelf();
        setIsViewingBook(false);
        setCurrentViewingBookIndex(-1);
    }

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
        
        // Only load pages if they haven't been loaded yet
        if (!currentBookResource.loaded) {
            await loadBookPages(currentBookResource);
        }
        else {
            console.log("Book already loaded");
        }
        
        sceneRef.current.viewBook(bookIndex);
        if (sceneRef.current.isInVR()) {
            setBookAngle(Math.PI / 2);
        }

        setIsViewingBook(true);
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        const bookPromises = sources.map(async (resource, index) => {
            try {
                const defaultPageCount = 1; // Start with just 1 page as a placeholder

                // Create empty book
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load(defaultBookTexture.path),
                    defaultBookTexture.coverPositions
                ), defaultPageCount, index);

                if (sceneRef.current) {
                    sceneRef.current.addBook(book);
                    setBookCount(sceneRef.current.getBookCount());
                }

                return new BookResourceMapping(book, resource, false, index);
            } catch (error) {
                console.error(`Failed to load PDF from ${resource.getDisplayName()}:`, error);
                return null;
            }
        });

        const results = (await Promise.all(bookPromises)).filter((result): result is BookResourceMapping => result !== null);
        const resultsSorted = results.sort((a, b) => a.index - b.index);

        // Update both the ref and the state
        const newMappings = resultsSorted.reduce((acc, mapping) => {
            acc[mapping.index] = mapping;
            return acc;
        }, {} as { [index: number]: BookResourceMapping });
        
        bookResourceMappingsRef.current = newMappings;
        setBookResourceMappings(newMappings);
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

            // Update both the ref and the state
            bookResourceMappingsRef.current = {
                ...bookResourceMappingsRef.current,
                [bookResourceMapping.index]: { ...bookResourceMapping, loaded: true }
            };
            setBookResourceMappings(prevMappings => ({
                ...prevMappings,
                [bookResourceMapping.index]: { ...bookResourceMapping, loaded: true }
            }));

        } catch (error) {
            console.error('Failed to load book pages:', error);
        }
    };

    useEffect(() => {
        if (sceneRef.current) {
            const handleVRSessionStart = () => {
                if (isViewingBook) {
                    setBookAngle(Math.PI / 2);
                }
            };

            const handleVRSessionEnd = () => {
                // Reset any VR-specific states if needed
            };

            if (sceneRef.current.isInVR()) {
                sceneRef.current.onVRSessionStart(handleVRSessionStart);
                sceneRef.current.onVRSessionEnd(handleVRSessionEnd);
            }

            return () => {
                if (sceneRef.current) {
                    sceneRef.current.removeVRSessionListeners();
                }
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
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'bookshelf-scene.glb';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Failed to export scene:', error);
            // You might want to show an error message to the user here
        }
    };

    const handleBookCollectorSource = async (source: BookCollectorSource, method: BookFetchingMethod) => {
        setShowBookCollectorModal(false);
        try {
            if (method === 'all') {
                const bookSources = await BookCollectorAPI.fetchBooks(source);
                const pdfResources = bookSources.map(source => 
                    createPDFResource(source.pdf_path)
                );
                await handlePDFSourcesSubmitted(pdfResources);
            } else {
                // Start paginated loading
                const iterator = await BookCollectorAPI.createPaginatedBooks(source);
                
                // We don't want to await this as it will continuously load books
                (async () => {
                    try {
                        for await (const bookChunk of iterator) {
                            const pdfResources = bookChunk.map(source =>
                                createPDFResource(source.pdf_path)
                            );
                            await handlePDFSourcesSubmitted(pdfResources);
                        }
                    } catch (error) {
                        console.error('Error during paginated book loading:', error);
                    }
                })();
            }
        } catch (error) {
            console.error('Failed to fetch books from collector:', error);
        }
    };

    return (
        <div className="bookshelf-viewer">
            <div ref={containerRef} className="scene-container" />
            <button 
                className="download-button"
                onClick={handleDownloadScene}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 1000
                }}
            >
                Download Scene
            </button>
            {isViewingBook && (
                <button 
                    className="return-book-button"
                    onClick={returnBook}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '8px 16px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        zIndex: 1000
                    }}
                >
                    Return Book
                </button>
            )}
            <div className="controls">
                <button 
                    className="add-book-button"
                    onClick={() => setShowUrlModal(true)}
                >
                    Add Books
                </button>
                <button 
                    className="load-collector-button"
                    onClick={() => setShowBookCollectorModal(true)}
                >
                    Load from Book Collector
                </button>
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

            {isViewingBook && getCurrentBookInfo() && (
                <div className="book-info">
                    <h3>{getCurrentBookInfo()?.title}</h3>
                    <p>By {getCurrentBookInfo()?.author}</p>
                    <p>Pages: {getCurrentBookInfo()?.pageCount}</p>
                </div>
            )}

            <BookCollectorModal 
                isOpen={showBookCollectorModal}
                onClose={() => setShowBookCollectorModal(false)}
                onSourceSelected={handleBookCollectorSource}
            />
        </div>
    );
} 