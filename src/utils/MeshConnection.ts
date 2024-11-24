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
        const newGeometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];
        let vertexCounter = 0;

        // Process each input geometry
        geometries.forEach((geometry) => {
            const positions = geometry.getAttribute('position').array;
            const originalIndices = geometry.getIndex()?.array || [];

            // Process each face (triangle) in the original geometry
            for (let i = 0; i < originalIndices.length; i += 3) {
                // Add three new vertices for this face
                for (let j = 0; j < 3; j++) {
                    const originalVertexIndex = originalIndices[i + j];
                    const posIndex = originalVertexIndex * 3;
                    vertices.push(
                        positions[posIndex],
                        positions[posIndex + 1],
                        positions[posIndex + 2]
                    );
                }

                // Create a new face using the newly added vertices
                indices.push(
                    vertexCounter,
                    vertexCounter + 1,
                    vertexCounter + 2
                );
                vertexCounter += 3;
            }
        });

        // Process connecting faces
        connectingFaces.forEach(face => {
            face.forEach(([vertexIndex, meshIndex]) => {
                // Get the original vertex position from the source geometry
                const sourceGeometry = geometries[meshIndex];
                const positions = sourceGeometry.getAttribute('position').array;
                const posIndex = vertexIndex * 3;

                // Add a new vertex
                vertices.push(
                    positions[posIndex],
                    positions[posIndex + 1],
                    positions[posIndex + 2]
                );
            });

            // Create face using the newly added vertices
            indices.push(
                vertexCounter,
                vertexCounter + 1,
                vertexCounter + 2
            );
            vertexCounter += 3;
        });

        newGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        newGeometry.setIndex(indices);
        newGeometry.computeVertexNormals();

        return newGeometry;
    }
} 