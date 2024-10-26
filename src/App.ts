import { MainScene } from './scenes/MainScene';
import { BookMeshParams } from './components/Book';
import { BookshelfParams } from './components/Bookshelf';

document.addEventListener('DOMContentLoaded', () => {
    const defaultBookParams: BookMeshParams = {
        bookThickness: 1,
        bookWidth: 15,
        bookHeight: 20,
        coverWidth: 4,
        numPages: 100,
    };

    const defaultBookshelfParams: BookshelfParams = {
        cellHeight: 10,
        cellWidth: 15,
        cellDepth: 10,
        numColumns: 5,
        numRows: 4,
        sideWallThickness: 1,
        interFloorThickness: 1,
        mainSideWallThickness: 1,
        mainRoofBottomThickness: 1,
        backWallThickness: 0,
    };

    new MainScene(
        10,
        defaultBookParams,
        defaultBookshelfParams
    );
});
