import React, { useEffect, useRef, useState } from 'react';
import { Book, PageSelectedState, UniformlyOpenedState } from '../components/Bookshelf/Book';

interface BookStateControlsUIProps {
    book: Book;
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

export function BookStateControlsUI({ book }: BookStateControlsUIProps) {
    const animationFrameRef = useRef<number | undefined>(undefined);
    const [bookStateMode, setBookStateMode] = useState<BookStateMode>('uniform');

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
