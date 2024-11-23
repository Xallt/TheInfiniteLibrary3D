import { MeshConnection, MeshConnectionFace } from '../utils/MeshConnection';
import * as THREE from 'three';
import { TextureLoader } from './Book';

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

    /**
     * Determines UV coordinates for a triangle face based on its orientation
     * Uses the most visible coordinates for each face orientation:
     * - XY plane (front/back faces) -> use X,Y coordinates
     * - YZ plane (left/right faces) -> use Y,Z coordinates
     * - XZ plane (top/bottom faces) -> use X,Z coordinates
     */
    private getFaceUVs(vertices: THREE.Vector3[]): number[] {
        if (vertices.length !== 3) {
            throw new Error('Face must have exactly 3 vertices');
        }

        // Calculate outer size including all thicknesses
        const outerSize = new THREE.Vector3(
            this.thicknessLeft + this.cellSize.x + this.thicknessRight,
            this.thicknessDown + this.cellSize.y + this.thicknessUp,
            this.thicknessBack + this.cellSize.z
        );

        // Calculate face normal to determine orientation
        const v1 = vertices[1].clone().sub(vertices[0]);
        const v2 = vertices[2].clone().sub(vertices[0]);
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
        vertices.forEach(vertex => {
            if (dominantAxis === absNormal.x) {
                // Face is parallel to YZ plane (left/right faces)
                uvs.push(
                    (vertex.y - this.upperLeftFarCorner.y) / outerSize.y,
                    (vertex.z - (this.upperLeftFarCorner.z - outerSize.z)) / outerSize.z
                );
            } else if (dominantAxis === absNormal.y) {
                // Face is parallel to XZ plane (top/bottom faces)
                uvs.push(
                    (vertex.x - this.upperLeftFarCorner.x) / outerSize.x,
                    (vertex.z - (this.upperLeftFarCorner.z - outerSize.z)) / outerSize.z
                );
            } else {
                // Face is parallel to XY plane (front/back faces)
                uvs.push(
                    (vertex.x - this.upperLeftFarCorner.x) / outerSize.x,
                    (vertex.y - this.upperLeftFarCorner.y) / outerSize.y
                );
            }
        });

        return uvs;
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

        // Calculate UVs for each face
        const uvs: number[] = [];
        const uvMap = new Map<number, [number, number]>();

        for (let i = 0; i < indices.length; i += 3) {
            const faceVertices = [
                vertices[indices[i]],
                vertices[indices[i + 1]],
                vertices[indices[i + 2]]
            ];
            const faceUVs = this.getFaceUVs(faceVertices);

            // Store UVs for each vertex
            for (let j = 0; j < 3; j++) {
                const vertexIndex = indices[i + j];
                uvMap.set(vertexIndex, [faceUVs[j * 2], faceUVs[j * 2 + 1]]);
            }
        }

        // Create final UV array
        for (let i = 0; i < vertices.length; i++) {
            const uv = uvMap.get(i) || [0, 0];
            uvs.push(uv[0], uv[1]);
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