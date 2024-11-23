import { MeshConnection, MeshConnectionFace } from '../utils/MeshConnection';
import * as THREE from 'three';

export class ProceduralBookshelfCell {
    private upperLeftFarCorner: THREE.Vector3;
    private cellSize: THREE.Vector3;
    private thicknessLeft: number;
    private thicknessRight: number;
    private thicknessBack: number;
    private thicknessUp: number;
    private thicknessDown: number;

    constructor(
        cellUpperLeftFarCorner: THREE.Vector3,
        cellSize: THREE.Vector3,
        cellThicknessLeft: number,
        cellThicknessRight: number,
        cellThicknessBack: number,
        cellThicknessUp: number,
        cellThicknessDown: number,
    ) {
        this.upperLeftFarCorner = cellUpperLeftFarCorner.clone();
        this.cellSize = cellSize.clone();
        this.thicknessLeft = cellThicknessLeft;
        this.thicknessRight = cellThicknessRight;
        this.thicknessBack = cellThicknessBack;
        this.thicknessUp = cellThicknessUp;
        this.thicknessDown = cellThicknessDown;
    }

    /**
     * Creates 8 points forming a 3D rectangle from an upper left far corner and size
     * Points are ordered as follows:
     * 0: Back Top Left     (upperLeftFarCorner)
     * 1: Back Top Right
     * 2: Back Bottom Left
     * 3: Back Bottom Right
     * 4: Front Top Left
     * 5: Front Top Right
     * 6: Front Bottom Left
     * 7: Front Bottom Right
     */
    private get3DRectPoints(corner: THREE.Vector3, size: THREE.Vector3): THREE.Vector3[] {
        return [
            // Back points
            new THREE.Vector3(
                corner.x,              // Back Top Left
                corner.y,
                corner.z
            ),
            new THREE.Vector3(
                corner.x + size.x,     // Back Top Right
                corner.y,
                corner.z
            ),
            new THREE.Vector3(
                corner.x,              // Back Bottom Left
                corner.y - size.y,
                corner.z
            ),
            new THREE.Vector3(
                corner.x + size.x,     // Back Bottom Right
                corner.y - size.y,
                corner.z
            ),

            // Front points
            new THREE.Vector3(
                corner.x,              // Front Top Left
                corner.y,
                corner.z - size.z
            ),
            new THREE.Vector3(
                corner.x + size.x,     // Front Top Right
                corner.y,
                corner.z - size.z
            ),
            new THREE.Vector3(
                corner.x,              // Front Bottom Left
                corner.y - size.y,
                corner.z - size.z
            ),
            new THREE.Vector3(
                corner.x + size.x,     // Front Bottom Right
                corner.y - size.y,
                corner.z - size.z
            )
        ];
    }

    private getOuterCellPoints(): THREE.Vector3[] {
        const outerSize = new THREE.Vector3(
            this.thicknessLeft + this.cellSize.x + this.thicknessRight,
            this.thicknessDown + this.cellSize.y + this.thicknessUp,
            this.thicknessBack + this.cellSize.z
        );
        return this.get3DRectPoints(this.upperLeftFarCorner, outerSize);
    }

    private getInnerCellPoints(): THREE.Vector3[] {
        const innerCorner = new THREE.Vector3(
            this.upperLeftFarCorner.x + this.thicknessLeft,
            this.upperLeftFarCorner.y - this.thicknessUp,
            this.upperLeftFarCorner.z - this.thicknessBack
        );
        return this.get3DRectPoints(innerCorner, this.cellSize);
    }

    private createWallFaces(baseIndex: number): number[] {
        return [
            baseIndex + 0, baseIndex + 1, baseIndex + 2,  // First triangle
            baseIndex + 2, baseIndex + 1, baseIndex + 3   // Second triangle
        ];
    }

    private createCellGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
        const vertices: number[] = [];
        const indices: number[] = [];

        // Convert Vector3 points to flat array of numbers
        points.forEach(point => {
            vertices.push(point.x, point.y, point.z);
        });

        // Left wall (using points 0,2,4,6)
        indices.push(
            ...this.createWallFaces(0).map(i => [0, 2, 4, 6][i])
        );

        // Right wall (using points 1,3,5,7)
        indices.push(
            ...this.createWallFaces(0).map(i => [1, 3, 5, 7][i])
        );

        // Top wall (using points 0,1,4,5)
        indices.push(
            ...this.createWallFaces(0).map(i => [0, 1, 4, 5][i])
        );

        // Bottom wall (using points 2,3,6,7)
        indices.push(
            ...this.createWallFaces(0).map(i => [2, 3, 6, 7][i])
        );

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }

    private getOuterCellGeometry(): THREE.BufferGeometry {
        return this.createCellGeometry(this.getOuterCellPoints());
    }

    private getInnerCellGeometry(): THREE.BufferGeometry {
        return this.createCellGeometry(this.getInnerCellPoints());
    }

    public getMesh(): THREE.Mesh {
        const innerCellGeometry = this.getInnerCellGeometry();
        const outerCellGeometry = this.getOuterCellGeometry();

        // Create connecting faces between inner and outer cells
        const connectingFacesBack: MeshConnectionFace[] = [
            // Connect front faces
            ...MeshConnection.connectQuads([4, 6], [4, 6]), // Left wall
            ...MeshConnection.connectQuads([7, 5], [7, 5]), // Right wall
            ...MeshConnection.connectQuads([5, 4], [5, 4]), // Top wall
            ...MeshConnection.connectQuads([6, 7], [6, 7]), // Bottom wall
        ];

        const connectingFacesFront: MeshConnectionFace[] = [
            ...MeshConnection.connectQuads([2, 0], [2, 0]), // Left wall
            ...MeshConnection.connectQuads([1, 3], [1, 3]), // Right wall
            ...MeshConnection.connectQuads([0, 1], [0, 1]), // Top wall
            ...MeshConnection.connectQuads([3, 2], [3, 2]), // Bottom wall
        ];

        const joinedGeometry = MeshConnection.joinGeometries(
            [outerCellGeometry, innerCellGeometry],
            [...connectingFacesBack, ...connectingFacesFront]
        );

        return new THREE.Mesh(
            joinedGeometry,
            new THREE.MeshLambertMaterial({
                color: 0x808080,
                side: THREE.DoubleSide
            })
        );
    }
}