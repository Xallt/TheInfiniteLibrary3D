import React, { useState } from "react";
import { BookCollectorSource } from "../api/BookCollectorAPI";

interface BookCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceSelected: (source: BookCollectorSource) => void;
}

export function BookCollectorModal({ isOpen, onClose, onSourceSelected }: BookCollectorModalProps) {
  const [selectedSource, setSelectedSource] = useState<BookCollectorSource>("guy_books");

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
          <button className="load-button" onClick={() => onSourceSelected(selectedSource)}>
            Load Books
          </button>
        </div>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
