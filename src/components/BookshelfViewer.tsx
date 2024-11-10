import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookParams, defaultBookshelfParams } from '../App';
import { PdfPage, PdfParser } from '../utils/pdfParser';
import { Book, TextureLoader } from './Book';
import { BookTexture } from './BookTexture';

export function BookshelfViewer() {
    const sceneRef = useRef<MainScene | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [bookCount, setBookCount] = useState(0);
    const [isViewingBook, setIsViewingBook] = useState(false);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [urls, setUrls] = useState<string[]>([
        'https://arxiv.org/pdf/1706.03762',
        'https://arxiv.org/pdf/1706.03762',
        'https://arxiv.org/pdf/1706.03762'
    ]);
    const [bookAngle, setBookAngle] = useState(Math.PI / 2); // Default open angle

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
        setUrls([...urls, '']);
    };

    const handleRemoveUrl = (index: number) => {
        setUrls(urls.filter((_, i) => i !== index));
    };

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const handleSubmitUrls = async () => {
        const validUrls = urls.filter(url => url.trim() !== '');
        setShowUrlModal(false);

        // Process all URLs in parallel
        const bookPromises = validUrls.map(async (url) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();

                // Parse PDF
                const parser = PdfParser.getInstance();
                const pagesParseResult = await parser.parsePdfToImages(arrayBuffer, {
                    imageFormat: 'png',
                    scale: 2.0
                });

                // Create book
                const book = Book.empty(defaultBookParams, new BookTexture(
                    TextureLoader.getInstance().load("assets/BookCovers0135_5_350.jpg"),
                    {
                        leftCoverPosition: 0.413,
                        rightCoverPosition: 0.582
                    }
                ));

                // Add book to scene immediately
                if (sceneRef.current) {
                    sceneRef.current.addBook(book);
                    setBookCount(sceneRef.current.getBookCount());
                }

                // Process pages in parallel
                book.setNumPages(pagesParseResult.metadata.numPages);
                for await (const page of pagesParseResult.pages) {
                    book.appendPageFromPdf(page);
                }

                return book;
            } catch (error) {
                console.error(`Failed to load PDF from ${url}:`, error);
                return null;
            }
        });

        // Wait for all books to be processed
        await Promise.all(bookPromises);

        // Reset URLs after processing
        setUrls(['https://arxiv.org/pdf/1706.03762']);
    };

    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const angle = parseFloat(event.target.value);
        setBookAngle(angle);
        if (sceneRef.current) {
            sceneRef.current.setBookAngle(angle);
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
                    Add Books from URLs
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
                <div className="angle-control">
                    <input
                        type="range"
                        min="0"
                        max={Math.PI}
                        step="0.01"
                        value={bookAngle}
                        onChange={handleAngleChange}
                        className="angle-slider"
                    />
                </div>
            )}

            {showUrlModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add PDF URLs</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setShowUrlModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="url-list">
                            {urls.map((url, index) => (
                                <div key={index} className="url-input-row">
                                    <input
                                        type="text"
                                        className="url-input"
                                        value={url}
                                        onChange={(e) => handleUrlChange(index, e.target.value)}
                                        placeholder="Enter PDF URL"
                                    />
                                    {urls.length > 1 && (
                                        <button
                                            className="remove-url"
                                            onClick={() => handleRemoveUrl(index)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button className="add-url" onClick={handleAddUrl}>
                            Add Another URL
                        </button>
                        <button 
                            className="submit-urls"
                            onClick={handleSubmitUrls}
                        >
                            Load PDFs
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 