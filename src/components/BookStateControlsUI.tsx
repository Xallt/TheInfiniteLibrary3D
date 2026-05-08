import React, { useEffect, useRef, useState } from 'react';
import { Book, BookOpeningState, buildPageSelectedState, buildUniformlyOpenedState, PageSelectedState, UniformlyOpenedState } from '../components/Bookshelf/Book';

interface BookStateControlsUIProps {
    book: Book;
}

interface UniformControlsProps {
    book: Book;
    uniformlyOpenedState: UniformlyOpenedState;
    onSwitchToReading: () => void;
}

function UniformControls({ book, uniformlyOpenedState, onSwitchToReading }: UniformControlsProps) {
    const [angle, setAngle] = useState(() => uniformlyOpenedState.angle);

    const handleAngleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        setAngle(value);
        book.actions.setState(buildUniformlyOpenedState(value));
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
    pageSelectedState: PageSelectedState;
    onSwitchToUniform: () => void;
}

function ReadingControls({ book, pageSelectedState, onSwitchToUniform }: ReadingControlsProps) {
    const getPageNum = () => pageSelectedState.selectedPageIndex;

    const handlePrevPage = () => {
        const prev = Math.max(getPageNum() - 1, 0);
        if (prev !== getPageNum()) book.actions.setState(buildPageSelectedState(Math.PI / 2, prev));
    };

    const handleNextPage = () => {
        const next = Math.min(getPageNum() + 1, book.state.pages.length);
        if (next !== getPageNum()) book.actions.setState(buildPageSelectedState(Math.PI / 2, next));
    };

    return (
        <div className="page-controls">
            <button className="panel-btn" onClick={handlePrevPage}>←</button>
            <button className="panel-btn" onClick={handleNextPage}>→</button>
            <button className="panel-btn" onClick={onSwitchToUniform}>Uniform Open</button>
        </div>
    );
}

export function BookStateControlsUI({ book }: BookStateControlsUIProps) {
    const animationFrameRef = useRef<number | undefined>(undefined);
    const [bookOpeningState, setBookOpeningState] = useState<BookOpeningState>(buildUniformlyOpenedState());

    useEffect(() => {
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [book]);


    const onSwitchToUniform = () => {
        setBookOpeningState(buildUniformlyOpenedState(Math.PI / 2));
        book.actions.setState(buildUniformlyOpenedState(Math.PI / 2));
    };

    const onSwitchToReading = () => {
        setBookOpeningState(buildPageSelectedState(Math.PI / 2, 0));
        book.actions.setState(buildPageSelectedState(Math.PI / 2, 0));
    };

    return (
        <div className="book-controls-panel panel">
            {bookOpeningState.stateType === 'pageSelected'
                ? <ReadingControls book={book} pageSelectedState={bookOpeningState as PageSelectedState} onSwitchToUniform={onSwitchToUniform} />
                : <UniformControls book={book} uniformlyOpenedState={bookOpeningState as UniformlyOpenedState} onSwitchToReading={onSwitchToReading} />
            }
        </div>
    );
}
