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

    const handleNextPage = () => {
        if (sceneRef.current) {
            onNextPage();
            // Update reading mode state based on scene state
            setIsReadingMode(sceneRef.current.isReadingBook());
        }
    };

    const handlePrevPage = () => {
        if (sceneRef.current) {
            onPrevPage();
            // Update reading mode state based on scene state
            setIsReadingMode(sceneRef.current.isReadingBook());
        }
    };

    const handleSwitchToUniform = () => {
        setIsReadingMode(false);
        // Set book angle to 90 degrees (PI/2)
        const event = {
            target: { value: String(Math.PI / 2) }
        } as React.ChangeEvent<HTMLInputElement>;
        onAngleChange(event);
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