import * as THREE from 'three';
import { createPageMesh, PageData } from "./Page";

export function PageComponent({ params, textures }: PageData, rotation: THREE.Euler, position: THREE.Vector3) {

    let mesh = createPageMesh(params, textures);

    return (
        <primitive object={mesh} rotation={rotation} position={position} />
    );

}