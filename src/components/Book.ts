import * as THREE from 'three';

export type BookMeshParams = {
    bookThickness: number;
    bookWidth: number;
    bookHeight: number;
    coverWidth: number;
};

export function createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3, texturePath: string): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
    const material = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(texturePath) });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
    return box;
}

export function createBookMesh(params: BookMeshParams, texturePath: string): THREE.Mesh {
    const cover = createBox(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(params.coverWidth, params.bookHeight, params.bookThickness),
        texturePath
    );
    const leftSide = createBox(
        new THREE.Vector3(-params.coverWidth / 2 - params.bookThickness / 2, 0, params.bookWidth / 2 - params.bookThickness / 2),
        new THREE.Vector3(params.bookThickness, params.bookHeight, params.bookWidth),
        texturePath
    );
    const rightSide = createBox(
        new THREE.Vector3(params.coverWidth / 2 + params.bookThickness / 2, 0, params.bookWidth / 2 - params.bookThickness / 2),
        new THREE.Vector3(params.bookThickness, params.bookHeight, params.bookWidth),
        texturePath
    );

    const book = new THREE.Mesh();
    book.add(cover);
    book.add(leftSide);
    book.add(rightSide);
    return book;
}
