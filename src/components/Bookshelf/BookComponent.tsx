import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { BookMeshParams, BookOpeningState } from "./Book";
import { BookCover } from "./BookCover";
import { BookTexture } from "./BookTexture";
import { Page, PageComponentProps } from "./PageComponent";

const HOVER_LERP = 0.15;

export type BookPageInput = Omit<PageComponentProps, "position" | "rotation">;

export interface BookProps {
  id: string;
  params: BookMeshParams;
  texture: BookTexture;
  pages: BookPageInput[];
  openingState: BookOpeningState | null;
  worldPosition: THREE.Vector3;
  worldRotation: THREE.Euler;
  hoverOffset?: number;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  onClick?: () => void;
}

function pageSlotPosition(index: number, numPages: number, params: BookMeshParams): THREE.Vector3 {
  const { bookThickness, coverWidth } = params;
  return new THREE.Vector3(
    -coverWidth / 2 + index * (coverWidth / numPages) + coverWidth / numPages / 2,
    0,
    bookThickness / 2
  );
}

function pageRotation(angle: number): THREE.Euler {
  return new THREE.Euler(0, angle - Math.PI / 2, 0);
}

export function Book({
  params,
  texture,
  pages,
  openingState,
  worldPosition,
  worldRotation,
  hoverOffset = 0,
  onPointerOver,
  onPointerOut,
  onClick,
}: BookProps) {
  const hoverGroupRef = useRef<THREE.Group>(null);
  const currentHoverRef = useRef(0);

  useFrame(() => {
    const next = currentHoverRef.current + (hoverOffset - currentHoverRef.current) * HOVER_LERP;
    currentHoverRef.current = next;
    if (hoverGroupRef.current) hoverGroupRef.current.position.z = next;
  });

  const numPages = pages.length;
  const { coverAngle, pageAngles } = openingState?.getPageRotationArgs(numPages) ?? {
    coverAngle: 0,
    pageAngles: Array(numPages).fill(0),
  };

  return (
    <group
      position={worldPosition}
      rotation={worldRotation}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <group ref={hoverGroupRef}>
        <BookCover params={params} texture={texture} coverAngle={coverAngle} />
        {pages.map((p, i) => (
          <Page
            key={p.id}
            id={p.id}
            params={p.params}
            textures={p.textures}
            position={pageSlotPosition(i, numPages, params)}
            rotation={pageRotation(pageAngles[i])}
          />
        ))}
      </group>
    </group>
  );
}
