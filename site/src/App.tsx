import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { BookshelfViewer } from './components/BookshelfViewer';
import { BookDesignStudio } from './components/BookDesignStudio';
import './styles/BookshelfViewer.css';
import './styles/BookDesignStudio.css';

export function App() {
    return (
        <BrowserRouter>
            <nav className="main-nav">
                <Link to="/">Bookshelf</Link>
                <Link to="/book-design">Book Design Studio</Link>
            </nav>
            <Routes>
                <Route path="/" element={<BookshelfViewer />} />
                <Route path="/book-design" element={<BookDesignStudio />} />
            </Routes>
        </BrowserRouter>
    );
};