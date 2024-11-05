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
    const [urls, setUrls] = useState<string[]>(['']);

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

    const handleAddBook = async () => {
        // Create a hidden file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        
        // Handle file selection
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Parse PDF
            const parser = PdfParser.getInstance();
            const pagesParseResult = await parser.parsePdfToImages(arrayBuffer, {
                imageFormat: 'png',
                scale: 2.0
            });

            // Collect all pages
            const book = Book.empty(defaultBookParams, "assets/book-cover.jpg");
            book.setNumPages(pagesParseResult.metadata.numPages);
            for await (const page of pagesParseResult.pages) {
                book.appendPageFromPdf(page);
            }

            // Add book with PDF pages
            if (sceneRef.current) {
                sceneRef.current.addBook(book);
                setBookCount(sceneRef.current.getBookCount());
            }
        };

        // Trigger file selection
        input.click();
    };

    const handleViewBook = () => {
        if (sceneRef.current) {
            if (!isViewingBook) {
                sceneRef.current.viewSelectedBook();
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

        for (const url of validUrls) {
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
                book.setNumPages(pagesParseResult.metadata.numPages);
                for await (const page of pagesParseResult.pages) {
                    book.appendPageFromPdf(page);
                }

                // Add book
                if (sceneRef.current) {
                    sceneRef.current.addBook(book);
                    setBookCount(sceneRef.current.getBookCount());
                }
            } catch (error) {
                console.error(`Failed to load PDF from ${url}:`, error);
            }
        }

        // Reset URLs after processing
        setUrls(['']);
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