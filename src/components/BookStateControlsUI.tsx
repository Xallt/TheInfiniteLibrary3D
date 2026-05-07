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
    const [angle, setAngle] = useState(() => (book.getCurrentState() as UniformlyOpenedState).getAngle());

    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setAngle(value);
        book.setState(new UniformlyOpenedState(value));
    };

    return (
        <>
            <input
                type="range"
                min="0"
                max={Math.PI / 2}
                step="0.01"
                value={angle}
                onChange={handleAngleChange}
                className="angle-slider"
            />
            <button className="panel-btn" onClick={onSwitchToReading}>Read Book</button>
        </>
    );
}

interface ReadingControlsProps {
    book: Book;
    onSwitchToUniform: () => void;
}

function ReadingControls({ book, onSwitchToUniform }: ReadingControlsProps) {
    const getPageNum = () => (book.getCurrentState() as PageSelectedState).getSelectedPageIndex();

    const handlePrevPage = () => {
        const prev = Math.max(getPageNum() - 1, 0);
        if (prev !== getPageNum()) book.setState(new PageSelectedState(Math.PI / 2, prev));
    };

    const handleNextPage = () => {
        const next = Math.min(getPageNum() + 1, book.getNumPages());
        if (next !== getPageNum()) book.setState(new PageSelectedState(Math.PI / 2, next));
    };

    return (
        <div className="page-controls">
            <button className="panel-btn" onClick={handlePrevPage}>←</button>
            <button className="panel-btn" onClick={handleNextPage}>→</button>
            <button className="panel-btn" onClick={onSwitchToUniform}>Uniform Open</button>
        </div>
    );
}

type BookStateMode = 'uniform' | 'reading';

export function BookStateControlsUI({ book, controllers }: BookStateControlsUIProps) {
    const animationFrameRef = useRef<number | undefined>(undefined);
    const [bookStateMode, setBookStateMode] = useState<BookStateMode>('uniform');

    useEffect(() => {
        const animate = () => {
            handleControllerInput();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
                        const prev = Math.max(currentPage - 1, 0);
                        if (prev !== currentPage) book.setState(new PageSelectedState(Math.PI / 2, prev));
                    }
                    if (controllerWrapper.isButtonNewlyPressed(3)) {
                        const next = Math.min(currentPage + 1, book.getNumPages() - 1);
                        if (next !== currentPage) book.setState(new PageSelectedState(Math.PI / 2, next));
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

    return (
        <div className="book-controls-panel panel">
            {bookStateMode === 'reading'
                ? <ReadingControls book={book} onSwitchToUniform={onSwitchToUniform} />
                : <UniformControls book={book} onSwitchToReading={onSwitchToReading} />
            }
        </div>
    );
}
