import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookParams, defaultBookshelfParams } from '../App';
import { PdfPage, PdfParser } from '../utils/pdfParser';

export function BookshelfViewer() {
    const sceneRef = useRef<MainScene | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [bookCount, setBookCount] = useState(0);
    const [isViewingBook, setIsViewingBook] = useState(false);

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
            const pagesGenerator = parser.parsePdfToImages(arrayBuffer, {
                imageFormat: 'png',
                scale: 2.0
            });

            // Collect all pages
            const pages: PdfPage[] = [];
            for await (const page of pagesGenerator) {
                pages.push(page);
            }

            // Add book with PDF pages
            if (sceneRef.current && pages.length > 0) {
                sceneRef.current.addBook(pages);
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
                    onClick={handleAddBook}
                >
                    Add Book
                </button>
                <button 
                    className="nav-button"
                    onClick={handleNextBook}
                    disabled={bookCount === 0 || isViewingBook}
                >
                    Next Book
                </button>
            </div>
        </div>
    );
} 