import * as THREE from 'three';

export type VertexRef = [number, number]; // [vertexIndex, meshNumber]
export type MeshConnectionFace = [VertexRef, VertexRef, VertexRef];

export class MeshConnection {
    /**
     * Creates two triangles to connect a quad from mesh1 to a quad from mesh2
     * Assumes the quads' vertices are provided in the same winding order
     * @param quad1Indices Two vertex indices from the first mesh forming one side of the quad
     * @param quad2Indices Two vertex indices from the second mesh forming the other side
     * @param mesh1Index Index of the first mesh (default 0)
     * @param mesh2Index Index of the second mesh (default 1)
     * @returns Two faces (triangles) that connect the quads
     */
    public static connectQuads(
        quad1Indices: [number, number],
        quad2Indices: [number, number],
        mesh1Index: number = 0,
        mesh2Index: number = 1
    ): [MeshConnectionFace, MeshConnectionFace] {
        const [a1, a2] = quad1Indices;
        const [b1, b2] = quad2Indices;

        return [
            // First triangle
            [
                [a1, mesh1Index],
                [b1, mesh2Index],
                [a2, mesh1Index]
            ],
            // Second triangle
            [
                [a2, mesh1Index],
                [b1, mesh2Index],
                [b2, mesh2Index]
            ]
        ];
    }

    /**
     * Combines multiple geometries into a single mesh, adding connecting faces between them.
     * @param geometries Array of geometries to connect
     * @param connectingFaces Array of faces that connect the geometries. Each face is defined by three [vertexIndex, meshNumber] pairs
     * @param material Material to use for the combined mesh
     * @returns Combined mesh with all original faces and connecting faces
     */
    public static joinGeometries(
        geometries: THREE.BufferGeometry[],
        connectingFaces: MeshConnectionFace[]
    ): THREE.BufferGeometry {
        // Create new geometry
        const newGeometry = new THREE.BufferGeometry();

        // Get vertex positions from all geometries
        const allVertices: number[] = [];
        const vertexMaps: Map<number, Map<number, number>> = new Map(); // [meshIndex][oldVertexIndex] -> newVertexIndex

        // Process each input geometry
        let vertexOffset = 0;
        geometries.forEach((geometry, meshIndex) => {
            const positions = geometry.getAttribute('position').array;
            const numVertices = positions.length / 3;
            const vertexMap = new Map<number, number>();
            vertexMaps.set(meshIndex, vertexMap);

            // Map each vertex from the original geometry to its new index
            for (let i = 0; i < numVertices; i++) {
                vertexMap.set(i, i + vertexOffset);

                const posIndex = i * 3;
                allVertices.push(
                    positions[posIndex],
                    positions[posIndex + 1],
                    positions[posIndex + 2]
                );
            }

            vertexOffset += numVertices;
        });

        // Combine existing indices from all geometries
        const allIndices: number[] = [];

        // Add original faces from each geometry
        geometries.forEach((geometry, meshIndex) => {
            const indices = geometry.getIndex()?.array || [];
            const vertexMap = vertexMaps.get(meshIndex);

            if (vertexMap === undefined) {
                throw new Error(`No vertex map found for mesh ${meshIndex}`);
            }

            for (let i = 0; i < indices.length; i++) {
                allIndices.push(vertexMap.get(indices[i])!);
            }
        });

        // Add connecting faces
        connectingFaces.forEach(face => {
            face.forEach(([vertexIndex, meshIndex]) => {
                const meshMap = vertexMaps.get(meshIndex);
                const newIndex = meshMap?.get(vertexIndex);
                if (newIndex === undefined) {
                    throw new Error(`Invalid vertex reference: mesh ${meshIndex}, vertex ${vertexIndex}`);
                }
                allIndices.push(newIndex);
            });
        });

        // Create the new geometry
        newGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(allVertices, 3)
        );
        newGeometry.setIndex(allIndices);
        newGeometry.computeVertexNormals();

        return newGeometry;
    }
} 