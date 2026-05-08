import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { BookCollectorSource, fetchBooks } from '../api/BookCollectorAPI';
import { defaultBookParams, defaultBookTexture, defaultBookshelfParams } from '../config/bookConfig';
import { MainScene } from '../scenes/MainScene';
import { PDFResource, createPDFResource } from '../types/PDFResource';
import { BookData } from '../types/BookData';
import { BookCollectorModal } from './BookCollectorModal';
import { TextureLoader } from './Bookshelf/Book';
import { BookTexture } from './Bookshelf/BookTexture';
import { BookStateControlsUI } from './BookStateControlsUI';
import { PDFSelectionModal } from './PDFSelectionModal';
import { BookshelfSceneInner } from '../scenes/BookshelfSceneInner';

const xrStore = createXRStore();

export function BookshelfViewer() {
    const mainScene = useMemo(() => new MainScene(defaultBookshelfParams), []);
    const [books, setBooks] = useState<BookData[]>([]);
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
        mainScene.viewBook(bookIndex);
        setIsViewingBook(true);
        setBooks(prev => prev.map((b, i) => i === bookIndex ? { ...b, loadPages: true } : b));
    };

    const handlePDFSourcesSubmitted = async (sources: PDFResource[]) => {
        const offset = books.length;
        const newBooks: BookData[] = sources.map((resource, i) => ({
            id: `book-${Date.now()}-${offset + i}`,
            pdfResource: resource,
            texture: new BookTexture(
                TextureLoader.getInstance().load(defaultBookTexture.path),
                defaultBookTexture.coverPositions
            ),
            params: defaultBookParams,
            loadPages: false,
        }));
        setBooks(prev => [...prev, ...newBooks]);
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
        const book = books[currentViewingBookIndex];
        if (!book) return null;
        const metadata = book.pdfResource.getMetadata();
        if (!metadata) return null;
        return {
            title: metadata.title || 'Untitled',
            author: metadata.author || 'Unknown Author',
            pageCount: metadata.numPages || 0,
        };
    };

    const bookInfo = getCurrentBookInfo();

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <Canvas gl={{ antialias: true, alpha: true }} flat>
                {isVRSupported ? (
                    <XR store={xrStore}>
                        <BookshelfSceneInner mainScene={mainScene} isVRSupported={isVRSupported} books={books} />
                    </XR>
                ) : (
                    <BookshelfSceneInner mainScene={mainScene} isVRSupported={isVRSupported} books={books} />
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
