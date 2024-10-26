import * as THREE from 'three';
import { TextureLoader } from './Book';

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

export class Bookshelf {
    private params: BookshelfParams;
    private texturePath: string;
    private bookshelfMesh: THREE.Mesh;

    constructor(params: BookshelfParams, texturePath: string) {
        this.params = params;
        this.texturePath = texturePath;
        this.bookshelfMesh = this.createBookshelfMesh();
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
    ): THREE.Mesh {
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
        return cell;
    }

    private createRow(
        rowUpperLeftFarCorner: THREE.Vector3,
        upperThickness: number,
        bottomThickness: number
    ): THREE.Mesh {
        const cells: THREE.Mesh[] = [];
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
        cells.forEach(cell => row.add(cell));
        return row;
    }

    private createBookshelfMesh(): THREE.Mesh {
        const rows: THREE.Mesh[] = [];
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
            rows.push(row);
            curCorner.y -= this.params.cellHeight + curUpperThickness + curBottomThickness;
        }

        const bookshelf = new THREE.Mesh();
        rows.forEach(row => bookshelf.add(row));
        return bookshelf;
    }

    public getMesh(): THREE.Mesh {
        return this.bookshelfMesh;
    }
}
