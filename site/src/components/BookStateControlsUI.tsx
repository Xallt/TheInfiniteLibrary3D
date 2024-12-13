import React, { useEffect, useRef, useState } from 'react';
import { Book, BookOpeningState, PageSelectedState, UniformlyOpenedState } from '../components/Bookshelf/Book';
import { ControllerWrapper } from '../scenes/MainScene';

interface BookStateControlsUIProps {
    book: Book;
    controllers: ControllerWrapper[];
}

interface UniformControlsProps {
    book: Book;
    onSwitchToReading: () => void;
}

function UniformControls({ book, onSwitchToReading }: UniformControlsProps) {
    const currentState = book.getCurrentState() as UniformlyOpenedState;
    
    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newAngle = parseFloat(event.target.value);
        book.setState(new UniformlyOpenedState(newAngle));
    };

    return (
        <>
            <input
                type="range"
                min="0"
                max={Math.PI / 2}
                step="0.01"
                value={currentState.getAngle()}
                onChange={handleAngleChange}
                className="angle-slider"
            />
            <button 
                className="reading-mode-button"
                onClick={onSwitchToReading}
            >
                Read Book
            </button>
        </>
    );
}

interface ReadingControlsProps {
    book: Book;
    onSwitchToUniform: () => void;
}

function ReadingControls({ book, onSwitchToUniform }: ReadingControlsProps) {
    const getPageNum = () => {
        const bookState = book.getCurrentState() as PageSelectedState;
        return bookState.getSelectedPageIndex();
    };

    const handlePrevPage = () => {
        const prevPageIndex = Math.max(getPageNum() - 1, 0);
        if (prevPageIndex !== getPageNum()) {
            book.setState(new PageSelectedState(Math.PI / 2, prevPageIndex));
        }
    };

    const handleNextPage = () => {
        const nextPageIndex = Math.min(getPageNum() + 1, book.getNumPages());
        if (nextPageIndex !== getPageNum()) {
            book.setState(new PageSelectedState(Math.PI / 2, nextPageIndex));
        }
    };

    return (
        <div className="page-controls">
            <button 
                className="page-nav-button"
                onClick={handlePrevPage}
            >
                ←
            </button>
            <button 
                className="page-nav-button"
                onClick={handleNextPage}
            >
                →
            </button>
            <button 
                className="uniform-mode-button"
                onClick={onSwitchToUniform}
            >
                Uniform Open
            </button>
        </div>
    );
}

type BookStateMode = 'uniform' | 'reading';

export function BookStateControlsUI({ book, controllers }: BookStateControlsUIProps) {
    const animationFrameRef = useRef<number>();
    const [bookStateMode, setBookStateMode] = useState<BookStateMode>('uniform');

    useEffect(() => {
        const animate = () => {
            handleControllerInput();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [book, controllers]);

    const handleControllerInput = () => {
        for (const controllerWrapper of controllers) {
            if (controllerWrapper.gamepad) {
                const currentState = book.getCurrentState();
                
                if (controllerWrapper.isButtonNewlyPressed(4)) {
                    if (currentState instanceof PageSelectedState) {
                        book.setState(new UniformlyOpenedState(Math.PI / 2));
                    } else {
                        book.setState(new PageSelectedState(Math.PI / 2, 0));
                    }
                }

                if (currentState instanceof PageSelectedState) {
                    const currentPage = currentState.getSelectedPageIndex();
                    if (controllerWrapper.isButtonNewlyPressed(2)) {
                        const prevPageIndex = Math.max(currentPage - 1, 0);
                        if (prevPageIndex !== currentPage) {
                            book.setState(new PageSelectedState(Math.PI / 2, prevPageIndex));
                        }
                    }
                    if (controllerWrapper.isButtonNewlyPressed(3)) {
                        const nextPageIndex = Math.min(currentPage + 1, book.getNumPages() - 1);
                        if (nextPageIndex !== currentPage) {
                            book.setState(new PageSelectedState(Math.PI / 2, nextPageIndex));
                        }
                    }
                }

                controllerWrapper.updateButtonStates();
            }
        }
    };

    const onSwitchToUniform = () => {
        setBookStateMode('uniform');
        book.setState(new UniformlyOpenedState(Math.PI / 2));
    };

    const onSwitchToReading = () => {
        setBookStateMode('reading');
        book.setState(new PageSelectedState(Math.PI / 2, 0));
    };

    const renderControls = () => {
        if (bookStateMode === 'reading') {
            return <ReadingControls book={book} onSwitchToUniform={onSwitchToUniform} />;
        } else {
            return <UniformControls book={book} onSwitchToReading={onSwitchToReading} />;
        }
    };

    return (
        <div className="angle-control">
            {renderControls()}
        </div>
    );
} 