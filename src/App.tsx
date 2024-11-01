import React from 'react';
import { BookshelfViewer } from './components/BookshelfViewer';
import './styles/BookshelfViewer.css';
import { BookMeshParams } from './components/Book';
import { BookshelfParams } from './components/Bookshelf';

// Move the parameters from App.ts to here
export const defaultBookParams: BookMeshParams = {
    bookThickness: 1,
    bookWidth: 15,
    bookHeight: 20,
    coverWidth: 4,
};

export const defaultBookshelfParams: BookshelfParams = {
    cellHeight: 30,
    cellWidth: 45,
    cellDepth: 30,
    numColumns: 5,
    numRows: 4,
    sideWallThickness: 1,
    interFloorThickness: 1,
    mainSideWallThickness: 1,
    mainRoofBottomThickness: 1,
    backWallThickness: 0,
};

export function App() {
    return (
        <BookshelfViewer />
    );
};