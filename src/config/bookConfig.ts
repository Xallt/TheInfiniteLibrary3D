import { BookMeshParams } from "../components/Bookshelf/Book";
import { BookshelfParams } from "../components/Bookshelf/Bookshelf";

export const defaultBookTexture = {
  path: `${import.meta.env.BASE_URL}resources/BookCovers0135_5_350.jpg`,
  coverPositions: {
    leftCoverPosition: 0.413,
    rightCoverPosition: 0.582,
  },
};

export const defaultBookParams: BookMeshParams = {
  bookThickness: 0.001,
  bookWidth: 0.15,
  bookHeight: 0.2,
  coverWidth: 0.04,
};

export const defaultBookshelfTexturePath = `${import.meta.env.BASE_URL}resources/wood.jpeg`;

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
