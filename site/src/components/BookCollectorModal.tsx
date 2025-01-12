import React, { useState } from 'react';
import { BookCollectorSource } from '../api/BookCollectorAPI';

export type BookFetchingMethod = 'all' | 'paginated';

interface BookCollectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceSelected: (source: BookCollectorSource, method: BookFetchingMethod) => void;
}

export function BookCollectorModal({ isOpen, onClose, onSourceSelected }: BookCollectorModalProps) {
    const [selectedSource, setSelectedSource] = useState<BookCollectorSource>('guy_books');
    const [fetchMethod, setFetchMethod] = useState<BookFetchingMethod>('all');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Select Book Source</h2>
                <div className="modal-select">
                    <select 
                        onChange={(e) => setSelectedSource(e.target.value as BookCollectorSource)}
                        value={selectedSource}
                    >
                        <option value="guy_books">Guy Books</option>
                    </select>
                    <div className="fetch-method-select">
                        <select
                            onChange={(e) => setFetchMethod(e.target.value as BookFetchingMethod)}
                            value={fetchMethod}
                        >
                            <option value="all">Fetch All</option>
                            <option value="paginated">Load Gradually</option>
                        </select>
                    </div>
                    <button 
                        className="load-button"
                        onClick={() => onSourceSelected(selectedSource, fetchMethod)}
                    >
                        Load Books
                    </button>
                </div>
                <button className="close-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
} 