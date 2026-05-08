import * as THREE from "three";
import {
  createFrontPageGeometry,
  createBackPageGeometry,
  createPageMaterial,
  PageParams,
  PageTextures,
} from "./Page";

export interface PageComponentProps {
  id: string;
  params: PageParams;
  textures: PageTextures;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export function Page({ params, textures, position, rotation }: PageComponentProps) {
  const frontGeom = createFrontPageGeometry(params);
  const backGeom = createBackPageGeometry(params);
  const frontMat = createPageMaterial(textures.front);
  const backMat = createPageMaterial(textures.back);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={frontGeom} material={frontMat} />
      <mesh geometry={backGeom} material={backMat} />
    </group>
  );
}
