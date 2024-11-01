import React, { useEffect, useRef, useState } from 'react';
import { MainScene } from '../scenes/MainScene';
import { defaultBookParams, defaultBookshelfParams } from '../App';
import { PdfParser } from '../utils/pdfParser';

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
            0, // Start with 0 books
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

    const handleAddBook = () => {
        if (sceneRef.current) {
            sceneRef.current.addBook();
            setBookCount(sceneRef.current.getBookCount());
        }
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

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Parse PDF
        const parser = PdfParser.getInstance();
        const pages = await parser.parsePdfToImages(arrayBuffer, {
            imageFormat: 'png',
            scale: 2.0
        });

        if (pages.length > 0) {
            // Create blob from the first page's image data
            const blob = new Blob([pages[0].imageData], { type: 'image/png' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'page1.png';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
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
                <label className="parse-pdf-button">
                    Parse PDF
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>
        </div>
    );
} 