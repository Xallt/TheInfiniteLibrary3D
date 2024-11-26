import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { BookshelfViewer } from './components/BookshelfViewer';
import { BookDesignStudio } from './components/BookDesignStudio';
import './styles/BookshelfViewer.css';
import './styles/BookDesignStudio.css';
import { BookMeshParams } from './components/Bookshelf/Book';
import { BookshelfParams } from './components/Bookshelf/Bookshelf';

// Move the parameters from App.ts to here
export const defaultBookParams: BookMeshParams = {
    bookThickness: 0.01,
    bookWidth: 0.15,
    bookHeight: 0.2,
    coverWidth: 0.04,
};

export const defaultBookshelfParams: BookshelfParams = {
    cellHeight: 0.3,
    cellWidth: 0.45,
    cellDepth: 0.3,
    numColumns: 5,
    numRows: 4,
    sideWallThickness: 0.04,
    interFloorThickness: 0.04,
    mainSideWallThickness: 0.04,
    mainRoofBottomThickness: 0.04,
    backWallThickness: 0,
};

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