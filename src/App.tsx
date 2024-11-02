import React from 'react';
import { BookshelfViewer } from './components/BookshelfViewer';
import './styles/BookshelfViewer.css';
import { BookMeshParams } from './components/Book';
import { BookshelfParams } from './components/Bookshelf';

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
    sideWallThickness: 0.01,
    interFloorThickness: 0.01,
    mainSideWallThickness: 0.01,
    mainRoofBottomThickness: 0.01,
    backWallThickness: 0,
};

export function App() {
    return (
        <BookshelfViewer />
    );
};