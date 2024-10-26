import * as THREE from 'three';

export type BookMeshParams = {
    bookThickness: number;
    bookWidth: number;
    bookHeight: number;
    coverWidth: number;
};

export function createBox(boxSize: THREE.Vector3, texturePath: string): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
    const material = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(texturePath) });
    return new THREE.Mesh(geometry, material);
}

export function createBookMesh(params: BookMeshParams, texturePath: string): THREE.Mesh {
    const cover = createBox(new THREE.Vector3(params.coverWidth, params.bookHeight, params.bookThickness), texturePath);
    const leftSide = createBox(new THREE.Vector3(params.bookWidth, params.bookHeight, params.bookThickness), texturePath);
    const rightSide = createBox(new THREE.Vector3(params.bookWidth, params.bookHeight, params.bookThickness), texturePath);

    const book = new THREE.Mesh();
    book.add(cover);
    book.add(leftSide);
    book.add(rightSide);
    return book;
}
