import React, { useState, useEffect, useRef } from 'react';
import { Book, PageSelectedState } from '../components/Bookshelf/Book';
import { ControllerWrapper } from '../scenes/MainScene';

interface BookStateControlsUIProps {
    book: Book | null;
    controllers: ControllerWrapper[];
}

export function BookStateControlsUI({ book, controllers }: BookStateControlsUIProps) {
    const [bookAngle, setBookAngle] = useState(Math.PI / 4);
    const [isReadingMode, setIsReadingMode] = useState(false);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        // Start animation loop when component mounts
        const animate = () => {
            handleControllerInput();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Cleanup animation loop when component unmounts
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [book, controllers]); // Re-setup animation when book or controllers change

    if (!book) return null;

    const handleControllerInput = () => {
        for (const controllerWrapper of controllers) {
            if (controllerWrapper.gamepad) {
                // Check for reading mode toggle (button 4 - typically the trigger button)
                if (controllerWrapper.isButtonNewlyPressed(4)) {
                    const currentState = book.getCurrentState();
                    if (currentState instanceof PageSelectedState) {
                        handleSwitchToUniform();
                    } else {
                        handleSwitchToReading();
                    }
                }

                // Check for page navigation (buttons 2 and 3 - typically the grip buttons)
                if (isReadingMode) {
                    if (controllerWrapper.isButtonNewlyPressed(2)) {
                        handlePrevPage();
                    }
                    if (controllerWrapper.isButtonNewlyPressed(3)) {
                        handleNextPage();
                    }
                }

                // Update button states for next frame
                controllerWrapper.updateButtonStates();
            }
        }
    };

    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newAngle = parseFloat(event.target.value);
        setBookAngle(newAngle);
        book.setCoverAngles(newAngle);
    };

    const handleSwitchToReading = () => {
        setIsReadingMode(true);
        book.selectPage(0); // Start with first page
    };

    const handleNextPage = () => {
        const currentState = book.getCurrentState();
        if ('getSelectedPageIndex' in currentState) {
            const currentReadingState = currentState as PageSelectedState;
            const currentIndex = currentReadingState.getSelectedPageIndex();
            const nextPageIndex = Math.min(currentIndex + 1, book.getNumPages() - 1);
            if (nextPageIndex !== currentIndex) {
                book.selectPage(nextPageIndex);
            }
        }
    };

    const handlePrevPage = () => {
        const currentState = book.getCurrentState();
        if ('getSelectedPageIndex' in currentState) {
            const currentReadingState = currentState as PageSelectedState;
            const currentIndex = currentReadingState.getSelectedPageIndex();
            const prevPageIndex = Math.max(currentIndex - 1, 0);
            if (prevPageIndex !== currentIndex) {
                book.selectPage(prevPageIndex);
            }
        }
    };

    const handleSwitchToUniform = () => {
        setIsReadingMode(false);
        book.setCoverAngles(Math.PI / 2);
        setBookAngle(Math.PI / 2);
    };

    return (
        <div className="angle-control">
            {!isReadingMode ? (
                <>
                    <input
                        type="range"
                        min="0"
                        max={Math.PI}
                        step="0.01"
                        value={bookAngle}
                        onChange={handleAngleChange}
                        className="angle-slider"
                    />
                    <button 
                        className="reading-mode-button"
                        onClick={handleSwitchToReading}
                    >
                        Read Book
                    </button>
                </>
            ) : (
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
                        onClick={handleSwitchToUniform}
                    >
                        Uniform Open
                    </button>
                </div>
            )}
        </div>
    );
} 