import * as THREE from 'three';

export type BookMeshParams = {
    bookThickness: number;
    bookWidth: number;
    bookHeight: number;
    coverWidth: number;
    numPages: number;
};

export function createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3, texturePath: string): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
    const material = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(texturePath) });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
    return box;
}


export function createPage(rootPosition: THREE.Vector3, pageSize: THREE.Vector2, texturePath: string): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(pageSize.x, pageSize.y);
    const material = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(texturePath), side: THREE.DoubleSide });
    const page = new THREE.Mesh(geometry, material);
    page.position.set(rootPosition.x, rootPosition.y, rootPosition.z);
    return page;
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

    let pages: THREE.Mesh[] = [];
    for (let i = 0; i < params.numPages; i++) {
        const pageWidth = (params.bookWidth - params.bookThickness) * 0.95;
        const page = createPage(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector2(pageWidth, params.bookHeight),
            "assets/page.jpg"
        );
        page.rotation.y = Math.PI / 2;
        page.position.x = - params.coverWidth / 2 + i * (params.coverWidth / (params.numPages)) + (params.coverWidth / (params.numPages)) / 2;
        page.position.z = pageWidth / 2 + params.bookThickness / 2;
        pages.push(page);
    }

    const book = new THREE.Mesh();
    book.add(cover);
    book.add(leftSide);
    book.add(rightSide);
    pages.forEach(page => book.add(page));
    return book;
}
