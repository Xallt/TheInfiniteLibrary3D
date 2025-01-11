import React from 'react';

interface BookCollectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceSelected: (source: 'example_book' | 'all/guy_books') => void;
}

export function BookCollectorModal({ isOpen, onClose, onSourceSelected }: BookCollectorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Select Book Source</h2>
                <div className="modal-buttons">
                    <button onClick={() => onSourceSelected('example_book')}>
                        Example Book
                    </button>
                    <button onClick={() => onSourceSelected('all/guy_books')}>
                        All Guy Books
                    </button>
                </div>
                <button className="close-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
} 