import * as THREE from 'three';

export type RectPointIndices = {
    backTopLeft: number;
    backTopRight: number;
    backBottomLeft: number;
    backBottomRight: number;
    frontTopLeft: number;
    frontTopRight: number;
    frontBottomLeft: number;
    frontBottomRight: number;
};

export class ProceduralMesh {
    /**
     * Creates 8 points forming a 3D rectangle from an upper left far corner and size
     */
    static get3DRectPoints(corner: THREE.Vector3, size: THREE.Vector3): {
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
} 