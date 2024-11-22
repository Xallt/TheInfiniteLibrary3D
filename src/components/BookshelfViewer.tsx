import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookParams, defaultBookshelfParams } from '../App';
import { PdfPage, PdfParser } from '../utils/pdfParser';
import { Book, TextureLoader } from './Book';
import { BookTexture } from './BookTexture';
import { Page } from './Page';
import { BookStateControlsUI } from './BookStateControlsUI';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';
import { PDFSelectionModal } from './PDFSelectionModal';

type BookResourceMapping = {
    book: Book;
    resource: PDFResource;
};

export function BookshelfViewer() {
    const sceneRef = useRef<MainScene | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [bookCount, setBookCount] = useState(0);
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [pdfResources, setPdfResources] = useState<PDFResource[]>([
        new URLPDFResource('https://arxiv.org/pdf/1706.03762')
    ]);
    const [bookAngle, setBookAngle] = useState(Math.PI / 2); // Default open angle
    const [bookResourceMappings, setBookResourceMappings] = useState<BookResourceMapping[]>([]);

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

    const handleViewBook = () => {
        if (sceneRef.current) {
            if (!isViewingBook) {
                sceneRef.current.viewSelectedBook();
                if (sceneRef.current.isInVR()) {
                    setBookAngle(Math.PI / 2);
                }
            } else {
                sceneRef.current.returnBookToShelf();
            }
            setIsViewingBook(!isViewingBook);
        }
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

    const handleAddUrl = () => {
        setPdfResources([...pdfResources, new URLPDFResource('')]);
    };

    const handleRemoveUrl = (index: number) => {
        setPdfResources(pdfResources.filter((_, i) => i !== index));
    };

    const handleUrlChange = (index: number, value: string) => {
        const newResources = [...pdfResources];
        newResources[index] = new URLPDFResource(value);
        setPdfResources(newResources);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newResources = Array.from(files)
            .filter(file => file.type.includes('pdf'))
            .map(file => createPDFResource(file));

        setPdfResources([...pdfResources, ...newResources]);
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        // Process all PDFs in parallel
        const bookPromises = sources.map(async (resource) => {
            try {
                const arrayBuffer = await resource.getArrayBuffer();

                // Parse PDF
                const parser = PdfParser.getInstance();
                const pagesParseResult = await parser.parsePdfToImages(arrayBuffer, {
                    imageFormat: 'png',
                    scale: 2.0
                });

                // Store metadata in the resource
                resource.setMetadata({
                    ...pagesParseResult.metadata
                });

                // Create book
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load("assets/BookCovers0135_5_350.jpg"),
                    {
                        leftCoverPosition: 0.413,
                        rightCoverPosition: 0.582
                    }
                ), pagesParseResult.metadata.numPages);

                // Add book to scene immediately
                if (sceneRef.current) {
                    sceneRef.current.addBook(book);
                    setBookCount(sceneRef.current.getBookCount());
                }

                // Process pages in parallel
                let index = 0;
                for await (const page of pagesParseResult.pages) {
                    book.addPage(Page.fromPdfPage(page, Page.getPageParams(book.getParams())), index++);
                }

                // Return both the book and resource for mapping
                return { book, resource };
            } catch (error) {
                console.error(`Failed to load PDF from ${resource.getDisplayName()}:`, error);
                return null;
            }
        });

        // Wait for all books to be processed and filter out any failed loads
        const results = (await Promise.all(bookPromises)).filter((result): result is BookResourceMapping => result !== null);
        
        // Update the mappings
        setBookResourceMappings(prevMappings => [...prevMappings, ...results]);
    };

    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const angle = parseFloat(event.target.value);
        setBookAngle(angle);
        if (sceneRef.current) {
            sceneRef.current.setBookAngle(angle);
        }
    };

    const handleSwitchToReading = () => {
        if (sceneRef.current) {
            sceneRef.current.switchToReadingMode();
        }
    };

    const handleNextPage = () => {
        if (sceneRef.current) {
            sceneRef.current.nextPage();
        }
    };

    const handlePrevPage = () => {
        if (sceneRef.current) {
            sceneRef.current.previousPage();
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

    const getCurrentBook = (): Book | null => {
        if (!sceneRef.current) return null;
        return sceneRef.current.getSelectedBook();
    };

    const getCurrentResource = (): PDFResource | null => {
        const currentBook = getCurrentBook();
        if (!currentBook) return null;
        
        const mapping = bookResourceMappings.find(m => m.book === currentBook);
        return mapping?.resource || null;
    };

    const getCurrentBookInfo = (): { title: string; author: string; pageCount: number } | null => {
        const resource = getCurrentResource();
        if (!resource || !resource.getMetadata()) return null;
        
        const metadata = resource.getMetadata();
        return {
            title: metadata?.title || 'Untitled',
            author: metadata?.author || 'Unknown Author',
            pageCount: metadata?.numPages || 0
        };
    };

    return (
        <div className="bookshelf-viewer">
            <div ref={containerRef} className="scene-container" />
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
                    sceneRef={sceneRef}
                    bookAngle={bookAngle}
                    onAngleChange={handleAngleChange}
                    onSwitchToReading={handleSwitchToReading}
                    onNextPage={handleNextPage}
                    onPrevPage={handlePrevPage}
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