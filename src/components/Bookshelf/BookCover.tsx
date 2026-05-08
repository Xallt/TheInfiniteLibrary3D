import * as THREE from "three";
import { BookMeshParams, createCoverGeometries } from "./Book";
import { BookTexture } from "./BookTexture";

export interface BookCoverProps {
  params: BookMeshParams;
  texture: BookTexture;
  coverAngle: number;
}

export function BookCover({ params, texture, coverAngle }: BookCoverProps) {
  const { spine, leftSide, rightSide } = createCoverGeometries(params, texture);
  const material = new THREE.MeshLambertMaterial({ map: texture.getTexture() });

  const { coverWidth, bookThickness } = params;

  console.log("coverAngle", coverAngle);

  return (
    <>
      <mesh geometry={spine} material={material} />
      <mesh
        geometry={rightSide}
        material={material}
        position={[-coverWidth / 2, 0, bookThickness / 2]}
        rotation={[0, -coverAngle, 0]}
      />
      <mesh
        geometry={leftSide}
        material={material}
        position={[coverWidth / 2, 0, bookThickness / 2]}
        rotation={[0, coverAngle, 0]}
      />
    </>
  );
}
