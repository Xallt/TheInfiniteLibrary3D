import React, { useState } from 'react';
import { MainScene } from '../scenes/MainScene';

interface BookStateControlsUIProps {
    sceneRef: React.MutableRefObject<MainScene | null>;
    bookAngle: number;
    onAngleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSwitchToReading: () => void;
    onNextPage: () => void;
    onPrevPage: () => void;
}

export function BookStateControlsUI({ 
    sceneRef,
    bookAngle, 
    onAngleChange,
    onSwitchToReading,
    onNextPage,
    onPrevPage
}: BookStateControlsUIProps) {
    const [isReadingMode, setIsReadingMode] = useState(false);

    const handleSwitchToReading = () => {
        setIsReadingMode(true);
        onSwitchToReading();
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
                        onChange={onAngleChange}
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
                        onClick={onPrevPage}
                    >
                        ←
                    </button>
                    <button 
                        className="page-nav-button"
                        onClick={onNextPage}
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
} 