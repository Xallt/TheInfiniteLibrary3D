import { MeshConnection, MeshConnectionFace } from '../utils/MeshConnection';
import * as THREE from 'three';
import { TextureLoader } from './Book';


type Edge = [number, number]; // Start and end vertex indices

// Wall parallel to YZ plane (left/right walls)
type YZWall = {
    frontEdge: Edge;        // Edge at the front of the bookshelf
    backEdge: Edge;         // Edge at the back of the bookshelf
    topEdge: Edge;          // Edge at the top
    bottomEdge: Edge;       // Edge at the bottom
};

// Wall parallel to XZ plane (top/bottom walls)
type XZWall = {
    frontEdge: Edge;        // Edge at the front of the bookshelf
    backEdge: Edge;         // Edge at the back
    leftEdge: Edge;         // Edge on the left side
    rightEdge: Edge;        // Edge on the right side
};

type CellEdges = {
    leftWall: YZWall;
    rightWall: YZWall;
    topWall: XZWall;
    bottomWall: XZWall;
};

type RectPointIndices = {
    backTopLeft: number;
    backTopRight: number;
    backBottomLeft: number;
    backBottomRight: number;
    frontTopLeft: number;
    frontTopRight: number;
    frontBottomLeft: number;
    frontBottomRight: number;
};

export class ProceduralBookshelfCell {
    private upperLeftFarCorner: THREE.Vector3;
    private cellSize: THREE.Vector3;
    private thicknessLeft: number;
    private thicknessRight: number;
    private thicknessBack: number;
    private thicknessUp: number;
    private thicknessDown: number;
    private texturePath: string;

    constructor(
        cellUpperLeftFarCorner: THREE.Vector3,
        cellSize: THREE.Vector3,
        cellThicknessLeft: number,
        cellThicknessRight: number,
        cellThicknessBack: number,
        cellThicknessUp: number,
        cellThicknessDown: number,
        texturePath: string
    ) {
        this.upperLeftFarCorner = cellUpperLeftFarCorner.clone();
        this.cellSize = cellSize.clone();
        this.thicknessLeft = cellThicknessLeft;
        this.thicknessRight = cellThicknessRight;
        this.thicknessBack = cellThicknessBack;
        this.thicknessUp = cellThicknessUp;
        this.thicknessDown = cellThicknessDown;
        this.texturePath = texturePath;
    }

    /**
     * Creates 8 points forming a 3D rectangle from an upper left far corner and size
     */
    private get3DRectPoints(corner: THREE.Vector3, size: THREE.Vector3): {
        points: THREE.Vector3[];
        indices: RectPointIndices;
    } {
        const points = [
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

        const indices: RectPointIndices = {
            backTopLeft: 0,
            backTopRight: 1,
            backBottomLeft: 2,
            backBottomRight: 3,
            frontTopLeft: 4,
            frontTopRight: 5,
            frontBottomLeft: 6,
            frontBottomRight: 7
        };

        return { points, indices };
    }

    private getOuterCellPoints(): { points: THREE.Vector3[], indices: RectPointIndices } {
        const outerSize = new THREE.Vector3(
            this.thicknessLeft + this.cellSize.x + this.thicknessRight,
            this.thicknessDown + this.cellSize.y + this.thicknessUp,
            this.thicknessBack + this.cellSize.z
        );
        return this.get3DRectPoints(this.upperLeftFarCorner, outerSize);
    }

    private getInnerCellPoints(): { points: THREE.Vector3[], indices: RectPointIndices } {
        const innerCorner = new THREE.Vector3(
            this.upperLeftFarCorner.x + this.thicknessLeft,
            this.upperLeftFarCorner.y - this.thicknessUp,
            this.upperLeftFarCorner.z - this.thicknessBack
        );
        return this.get3DRectPoints(innerCorner, this.cellSize);
    }

    private createCellGeometry(points: THREE.Vector3[], indices: RectPointIndices): { geometry: THREE.BufferGeometry, cellEdges: CellEdges } {
        const vertices: number[] = [];
        const indicesArray: number[] = [];
        let vertexCounter = 0;

        // Helper to add a quad (two triangles) with its own vertices
        const addQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) => {
            // Add 4 new vertices for this quad
            vertices.push(
                p1.x, p1.y, p1.z,
                p2.x, p2.y, p2.z,
                p3.x, p3.y, p3.z,
                p4.x, p4.y, p4.z
            );

            // Create two triangles using these new vertices
            indicesArray.push(
                vertexCounter, vertexCounter + 1, vertexCounter + 2,     // First triangle
                vertexCounter + 2, vertexCounter + 1, vertexCounter + 3  // Second triangle
            );

            vertexCounter += 4;
        };

        // Left wall (using points 0,2,4,6)
        addQuad(
            points[indices.frontBottomLeft],
            points[indices.backBottomLeft],
            points[indices.frontTopLeft],
            points[indices.backTopLeft]
        );
        const leftWall: YZWall = {
            frontEdge: [0, 2],
            backEdge: [1, 3],
            topEdge: [2, 3],
            bottomEdge: [0, 1]
        };

        // Right wall (using points 1,3,5,7)
        addQuad(
            points[indices.frontTopRight],
            points[indices.backTopRight],
            points[indices.frontBottomRight],
            points[indices.backBottomRight]
        );
        const rightWall: YZWall = {
            frontEdge: [0, 2].map(i => i + 4) as Edge,
            backEdge: [1, 3].map(i => i + 4) as Edge,
            topEdge: [0, 1].map(i => i + 4) as Edge,
            bottomEdge: [2, 3].map(i => i + 4) as Edge
        };

        // Top wall (using points 0,1,4,5)
        addQuad(
            points[indices.backTopLeft],
            points[indices.backTopRight],
            points[indices.frontTopLeft],
            points[indices.frontTopRight]
        );
        const topWall: XZWall = {
            frontEdge: [2, 3].map(i => i + 8) as Edge,
            backEdge: [0, 1].map(i => i + 8) as Edge,
            leftEdge: [0, 2].map(i => i + 8) as Edge,
            rightEdge: [1, 3].map(i => i + 8) as Edge
        };

        // Bottom wall (using points 2,3,6,7)
        addQuad(
            points[indices.frontBottomLeft],
            points[indices.frontBottomRight],
            points[indices.backBottomLeft],
            points[indices.backBottomRight]
        );
        const bottomWall: XZWall = {
            frontEdge: [0, 1].map(i => i + 12) as Edge,
            backEdge: [2, 3].map(i => i + 12) as Edge,
            leftEdge: [0, 2].map(i => i + 12) as Edge,
            rightEdge: [1, 3].map(i => i + 12) as Edge
        };

        const cellEdges: CellEdges = {
            leftWall: leftWall,
            rightWall: rightWall,
            topWall: topWall,
            bottomWall: bottomWall
        };

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indicesArray);
        geometry.computeVertexNormals();

        return { geometry, cellEdges };
    }

    private getOuterCellGeometry(): { geometry: THREE.BufferGeometry, cellEdges: CellEdges } {
        return this.createCellGeometry(this.getOuterCellPoints().points, this.getOuterCellPoints().indices);
    }

    private getInnerCellGeometry(): { geometry: THREE.BufferGeometry, cellEdges: CellEdges } {
        return this.createCellGeometry(this.getInnerCellPoints().points, this.getInnerCellPoints().indices);
    }

    /**
     * Determines UV coordinates for a triangle face based on its orientation
     * Uses the most visible coordinates for each face orientation:
     * - XY plane (front/back faces) -> use X,Y coordinates
     * - YZ plane (left/right faces) -> use Y,Z coordinates
     * - XZ plane (top/bottom faces) -> use X,Z coordinates
     */
    private getFaceUVs(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number[] {
        // Calculate outer size including all thicknesses
        const outerSize = new THREE.Vector3(
            this.thicknessLeft + this.cellSize.x + this.thicknessRight,
            this.thicknessDown + this.cellSize.y + this.thicknessUp,
            this.thicknessBack + this.cellSize.z
        );

        // Calculate face normal to determine orientation
        const v1 = p2.clone().sub(p1);
        const v2 = p3.clone().sub(p1);
        const normal = v1.cross(v2).normalize();

        // Determine which plane this face is most parallel to
        const absNormal = new THREE.Vector3(
            Math.abs(normal.x),
            Math.abs(normal.y),
            Math.abs(normal.z)
        );
        const dominantAxis = Math.max(absNormal.x, absNormal.y, absNormal.z);

        const uvs: number[] = [];

        // Choose UV mapping based on dominant axis and normalize by outer size
        [p1, p2, p3].forEach(vertex => {
            if (dominantAxis === absNormal.x) {
                // Face is parallel to YZ plane (left/right faces)
                uvs.push(
                    (this.upperLeftFarCorner.y - vertex.y) / outerSize.y,
                    (this.upperLeftFarCorner.z - vertex.z) / outerSize.z
                );
            } else if (dominantAxis === absNormal.y) {
                // Face is parallel to XZ plane (top/bottom faces)
                uvs.push(
                    (vertex.x - this.upperLeftFarCorner.x) / outerSize.x,
                    (this.upperLeftFarCorner.z - vertex.z) / outerSize.z
                );
            } else {
                // Face is parallel to XY plane (front/back faces)
                uvs.push(
                    (vertex.x - this.upperLeftFarCorner.x) / outerSize.x,
                    (this.upperLeftFarCorner.y - vertex.y) / outerSize.y
                );
            }
        });


        return uvs;
    }

    public getMesh(): THREE.Mesh {
        const { geometry: innerCellGeometry, cellEdges: innerCellEdges } = this.getInnerCellGeometry();
        const { geometry: outerCellGeometry, cellEdges: outerCellEdges } = this.getOuterCellGeometry();

        // Create connecting faces between inner and outer cells
        const connectingFacesBack: MeshConnectionFace[] = [
            ...MeshConnection.connectQuads(
                innerCellEdges.topWall.backEdge,
                outerCellEdges.topWall.backEdge
            ), // Top wall
            ...MeshConnection.connectQuads(
                innerCellEdges.bottomWall.backEdge,
                outerCellEdges.bottomWall.backEdge
            ), // Bottom wall
            ...MeshConnection.connectQuads(
                innerCellEdges.leftWall.backEdge.reverse() as Edge,
                outerCellEdges.leftWall.backEdge.reverse() as Edge
            ), // Left wall
            ...MeshConnection.connectQuads(
                innerCellEdges.rightWall.backEdge,
                outerCellEdges.rightWall.backEdge
            ), // Right wall
        ];

        const connectingFacesFront: MeshConnectionFace[] = [
            ...MeshConnection.connectQuads(
                innerCellEdges.leftWall.frontEdge.reverse() as Edge,
                outerCellEdges.leftWall.frontEdge.reverse() as Edge
            ), // Left wall
            ...MeshConnection.connectQuads(
                innerCellEdges.rightWall.frontEdge,
                outerCellEdges.rightWall.frontEdge
            ), // Right wall
            ...MeshConnection.connectQuads(
                innerCellEdges.topWall.frontEdge,
                outerCellEdges.topWall.frontEdge
            ), // Top wall
            ...MeshConnection.connectQuads(
                innerCellEdges.bottomWall.frontEdge,
                outerCellEdges.bottomWall.frontEdge
            ), // Bottom wall
        ];

        const joinedGeometry = MeshConnection.joinGeometries(
            [outerCellGeometry, innerCellGeometry],
            [...connectingFacesBack, ...connectingFacesFront]
        );

        // Get all vertices as Vector3 objects for UV calculation
        const positions = joinedGeometry.getAttribute('position').array;
        const indices = joinedGeometry.getIndex()!.array;
        const vertices: THREE.Vector3[] = [];
        for (let i = 0; i < positions.length; i += 3) {
            vertices.push(new THREE.Vector3(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            ));
        }

        // Instead of using a map, we'll create UVs for each vertex instance in faces
        const uvs: number[] = new Array(vertices.length * 2).fill(0);

        // Process each face (triangle) separately
        for (let i = 0; i < indices.length; i += 3) {
            const faceUVs = this.getFaceUVs(
                vertices[indices[i]],
                vertices[indices[i + 1]],
                vertices[indices[i + 2]]
            );

            // Assign UVs directly to the vertices as they appear in faces
            for (let j = 0; j < 3; j++) {
                const vertexIndex = indices[i + j];
                uvs[vertexIndex * 2] = faceUVs[j * 2];
                uvs[vertexIndex * 2 + 1] = faceUVs[j * 2 + 1];
            }
        }

        joinedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        return new THREE.Mesh(
            joinedGeometry,
            new THREE.MeshLambertMaterial({
                map: TextureLoader.getInstance().load(this.texturePath),
                side: THREE.DoubleSide
            })
        );
    }
}