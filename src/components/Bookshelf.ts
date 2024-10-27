import * as THREE from 'three';
import { TextureLoader, Book } from './Book';

export type BookshelfParams = {
    cellHeight: number;
    cellWidth: number;
    cellDepth: number;
    numColumns: number;
    numRows: number;
    sideWallThickness: number;
    interFloorThickness: number;
    mainSideWallThickness: number;
    mainRoofBottomThickness: number;
    backWallThickness: number;
};

type Cell = {
    mesh: THREE.Mesh;
    upperLeftFarCorner: THREE.Vector3;
    outerSize: THREE.Vector3;
    size: THREE.Vector3;
    availableX: number;
    leftSideThickness: number;
    rightSideThickness: number;
    backSideThickness: number;
    upSideThickness: number;
    downSideThickness: number;
};

type Row = {
    mesh: THREE.Mesh;
    cells: Cell[];
    outerSize: THREE.Vector3;
};

export class Bookshelf {
    private params: BookshelfParams;
    private texturePath: string;
    private bookshelfMesh: THREE.Mesh;
    private rows: Row[] = [];

    constructor(params: BookshelfParams, texturePath: string) {
        this.params = params;
        this.texturePath = texturePath;
        this.bookshelfMesh = this.createBookshelfMesh();
    }

    public getOuterSize(): THREE.Vector3 {
        const rowHeights = this.rows.map(row => row.outerSize.y);
        const sumHeights = rowHeights.reduce((a, b) => a + b, 0);
        return new THREE.Vector3(this.rows[0].outerSize.x, sumHeights, this.rows[0].outerSize.z);
    }

    private createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
        const material = new THREE.MeshLambertMaterial({ map: TextureLoader.getInstance().load(this.texturePath) });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
    }

    private createBoxWithCorner(boxUpperLeftFarCorner: THREE.Vector3, boxSize: THREE.Vector3): THREE.Mesh {
        const box = this.createBox(
            new THREE.Vector3(
                boxUpperLeftFarCorner.x + boxSize.x / 2,
                boxUpperLeftFarCorner.y - boxSize.y / 2,
                boxUpperLeftFarCorner.z - boxSize.z / 2
            ),
            boxSize
        );
        return box;
    }

    private createCell(
        cellUpperLeftFarCorner: THREE.Vector3,
        cellSize: THREE.Vector3,
        cellThicknessLeft: number,
        cellThicknessRight: number,
        cellThicknessBack: number,
        cellThicknessUp: number,
        cellThicknessDown: number,
    ): Cell {
        const outerSize = new THREE.Vector3(
            cellThicknessLeft + cellSize.x + cellThicknessRight,
            cellThicknessDown + cellSize.y + cellThicknessUp,
            cellThicknessBack + cellSize.z
        );

        const upWall = this.createBoxWithCorner(
            new THREE.Vector3(
                cellUpperLeftFarCorner.x,
                cellUpperLeftFarCorner.y,
                cellUpperLeftFarCorner.z - cellThicknessBack
            ),
            new THREE.Vector3(outerSize.x, cellThicknessUp, cellSize.z)
        );
        const downWall = this.createBoxWithCorner(
            new THREE.Vector3(
                cellUpperLeftFarCorner.x,
                cellUpperLeftFarCorner.y - cellThicknessUp - cellSize.y,
                cellUpperLeftFarCorner.z
            ),
            new THREE.Vector3(outerSize.x, cellThicknessDown, cellSize.z)
        );
        const leftWall = this.createBoxWithCorner(
            new THREE.Vector3(
                cellUpperLeftFarCorner.x,
                cellUpperLeftFarCorner.y - cellThicknessUp,
                cellUpperLeftFarCorner.z - cellThicknessBack
            ),
            new THREE.Vector3(cellThicknessLeft, cellSize.y, cellSize.z)
        );
        const rightWall = this.createBoxWithCorner(
            new THREE.Vector3(
                cellUpperLeftFarCorner.x + cellThicknessLeft + cellSize.x,
                cellUpperLeftFarCorner.y - cellThicknessUp,
                cellUpperLeftFarCorner.z - cellThicknessBack
            ),
            new THREE.Vector3(cellThicknessRight, cellSize.y, cellSize.z)
        );

        const cell = new THREE.Mesh();
        if (this.params.backWallThickness > 0) {
            const farWall = this.createBoxWithCorner(
                cellUpperLeftFarCorner,
                new THREE.Vector3(outerSize.x, outerSize.y, cellThicknessBack)
            );
            cell.add(farWall);
        }
        cell.add(upWall);
        cell.add(downWall);
        cell.add(leftWall);
        cell.add(rightWall);
        return {
            mesh: cell,
            upperLeftFarCorner: cellUpperLeftFarCorner.clone(),
            outerSize: outerSize,
            size: cellSize,
            availableX: 0,
            leftSideThickness: cellThicknessLeft,
            rightSideThickness: cellThicknessRight,
            backSideThickness: cellThicknessBack,
            upSideThickness: cellThicknessUp,
            downSideThickness: cellThicknessDown
        };
    }

    private createRow(
        rowUpperLeftFarCorner: THREE.Vector3,
        upperThickness: number,
        bottomThickness: number
    ): Row {
        const cells: Cell[] = [];
        let curCorner = rowUpperLeftFarCorner.clone();
        const cellSize = new THREE.Vector3(this.params.cellWidth, this.params.cellHeight, this.params.cellDepth);
        for (let j = 0; j < this.params.numColumns; j++) {
            let cellLeftThickness = this.params.sideWallThickness / 2;
            if (j == 0) {
                cellLeftThickness = this.params.mainSideWallThickness;
            }
            let cellRightThickness = this.params.sideWallThickness / 2;
            if (j == this.params.numColumns - 1) {
                cellRightThickness = this.params.mainSideWallThickness;
            }
            const cell = this.createCell(
                curCorner,
                cellSize,
                cellLeftThickness,
                cellRightThickness,
                this.params.backWallThickness,
                upperThickness,
                bottomThickness
            );
            cells.push(cell);

            curCorner.x += cellSize.x + cellLeftThickness + cellRightThickness;
        }

        const row = new THREE.Mesh();
        cells.forEach(cell => row.add(cell.mesh));
        return {
            mesh: row,
            cells: cells,
            outerSize: new THREE.Vector3(
                curCorner.x - rowUpperLeftFarCorner.x,
                cells[0].outerSize.y,
                cells[0].outerSize.z
            )
        };
    }

    private createBookshelfMesh(): THREE.Mesh {
        let curCorner = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < this.params.numRows; i++) {
            let curUpperThickness = this.params.interFloorThickness / 2;
            if (i == 0) {
                curUpperThickness = this.params.mainRoofBottomThickness;
            }
            let curBottomThickness = this.params.interFloorThickness / 2;
            if (i == this.params.numRows - 1) {
                curBottomThickness = this.params.mainRoofBottomThickness;
            }
            const row = this.createRow(
                curCorner,
                curUpperThickness,
                curBottomThickness
            );
            this.rows.push(row);
            curCorner.y -= this.params.cellHeight + curUpperThickness + curBottomThickness;
        }

        const bookshelf = new THREE.Mesh();
        this.rows.forEach(row => bookshelf.add(row.mesh));
        return bookshelf;
    }

    public getMesh(): THREE.Mesh {
        return this.bookshelfMesh;
    }

    public addBook(book: Book): boolean {
        const bookSize = book.getOuterSize();

        if (bookSize.x > this.params.cellWidth || bookSize.y > this.params.cellHeight || bookSize.z > this.params.cellDepth) {
            console.error("Book dimensions exceed cell size.");
            return false;
        }

        for (const row of this.rows) {
            for (const cell of row.cells) {
                if (cell.availableX + bookSize.x <= this.params.cellWidth) {
                    const bookMesh = book.getMesh().clone();
                    bookMesh.rotateY(Math.PI);

                    const newBookPosition = new THREE.Vector3(
                        cell.upperLeftFarCorner.x + cell.availableX + cell.leftSideThickness + bookSize.x / 2,
                        cell.upperLeftFarCorner.y - cell.upSideThickness - cell.size.y + bookSize.y / 2,
                        cell.upperLeftFarCorner.z - cell.backSideThickness - cell.size.z + bookSize.z
                    );

                    bookMesh.position.set(newBookPosition.x, newBookPosition.y, newBookPosition.z);

                    this.bookshelfMesh.add(bookMesh);
                    cell.availableX += bookSize.x;
                    return true;
                }
            }
        }
        return false;
    }
}
