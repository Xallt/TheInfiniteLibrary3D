import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookParams, defaultBookshelfParams } from '../App';
import { PdfPage, PdfParser } from '../utils/pdfParser';
import { Book, TextureLoader } from './Bookshelf/Book';
import { BookTexture } from './Bookshelf/BookTexture';
import { Page } from './Bookshelf/Page';
import { BookStateControlsUI } from './BookStateControlsUI';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';
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
    const [bookCount, setBookCount] = useState(0);
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [bookAngle, setBookAngle] = useState(Math.PI / 2); // Default open angle
    const [bookResourceMappings, setBookResourceMappings] = useState<{ [index: number]: BookResourceMapping }>({});

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
            defaultBookParams,
            defaultBookshelfParams
        );

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

    const handleViewBook = async () => {
        if (!sceneRef.current) return;

        if (!isViewingBook) {
            const currentBookResource = getCurrentBookResource();
            
            if (currentBookResource) {
                // Only load pages if they haven't been loaded yet
                if (!currentBookResource.loaded) {
                    loadBookPages(currentBookResource);
                }
                
                sceneRef.current.viewSelectedBook();
                if (sceneRef.current.isInVR()) {
                    setBookAngle(Math.PI / 2);
                }
            }
        } else {
            sceneRef.current.returnBookToShelf();
        }
        setIsViewingBook(!isViewingBook);
    };

    const handlePreviousBook = () => {
        if (sceneRef.current) {
            sceneRef.current.selectPreviousBook();
        }
    };

    const handleNextBook = () => {
        if (sceneRef.current) {
            sceneRef.current.selectNextBook();
        }
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        const bookPromises = sources.map(async (resource, index) => {
            try {
                const defaultPageCount = 1; // Start with just 1 page as a placeholder

                // Create empty book
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load("assets/BookCovers0135_5_350.jpg"),
                    {
                        leftCoverPosition: 0.413,
                        rightCoverPosition: 0.582
                    }
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

        setBookResourceMappings(resultsSorted.reduce((acc, mapping) => {
            acc[mapping.index] = mapping;
            return acc;
        }, {} as { [index: number]: BookResourceMapping }));
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

    const getCurrentBookResource = (): BookResourceMapping => {
        if (!sceneRef.current) throw new Error("Scene not initialized");
        const book = sceneRef.current.getSelectedBook();
        if (!book) throw new Error("No book selected");
        return bookResourceMappings[book.id] || null;
    };

    const getCurrentBookInfo = (): { title: string; author: string; pageCount: number } | null => {
        const resource = getCurrentBookResource();
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
            <div className="controls">
                <button 
                    className="nav-button"
                    onClick={handlePreviousBook}
                    disabled={bookCount === 0 || isViewingBook}
                >
                    Previous Book
                </button>
                <button 
                    className="view-button"
                    onClick={handleViewBook}
                    disabled={bookCount === 0}
                >
                    {isViewingBook ? 'Return to Shelf' : 'View Book'}
                </button>
                <button 
                    className="add-book-button"
                    onClick={() => setShowUrlModal(true)}
                >
                    Add Books
                </button>
                <button 
                    className="nav-button"
                    onClick={handleNextBook}
                    disabled={bookCount === 0 || isViewingBook}
                >
                    Next Book
                </button>
            </div>

            {isViewingBook && (
                <BookStateControlsUI 
                    book={sceneRef.current?.getSelectedBook()!}
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
        </div>
    );
} 