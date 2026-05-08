import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createControls } from "../components/Controls";
import { BookMeshParams, BookOpeningState } from "../components/Bookshelf/Book";
import { Book, BookPageInput } from "../components/Bookshelf/BookComponent";
import { BookTexture } from "../components/Bookshelf/BookTexture";
import { SceneSetup } from "./SceneSetup";
import { defaultMainSceneConfig } from "../config/mainSceneConfig";

const BOOK_POSITION = new THREE.Vector3(0, 0, 0);
const BOOK_ROTATION = new THREE.Euler(0, 0, 0);

interface BookSandboxSceneInnerProps {
  params: BookMeshParams;
  texture: BookTexture;
  pages: BookPageInput[];
  openingState: BookOpeningState;
}

function buildSandboxCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100);
  cam.position.set(0, 0, 0.5);
  return cam;
}

export function BookSandboxSceneInner({ params, texture, pages, openingState }: BookSandboxSceneInnerProps) {
  const { gl: renderer, set } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(buildSandboxCamera());
  const controlsRef = useRef<OrbitControls | null>(null);
  if (!controlsRef.current) {
    const ctrl = createControls(cameraRef.current);
    ctrl.target.set(0, 0, 0);
    controlsRef.current = ctrl;
  }

  useEffect(() => {
    set({ camera: cameraRef.current });
  }, [set]);

  useEffect(() => {
    const controls = controlsRef.current!;
    controls.domElement = renderer.domElement;
    controls.connect();
    return () => controls.disconnect();
  }, [renderer.domElement]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <>
      <SceneSetup config={defaultMainSceneConfig} />
      <primitive object={controlsRef.current} />
      <Book
        id="sandbox-book"
        params={params}
        texture={texture}
        pages={pages}
        openingState={openingState}
        worldPosition={BOOK_POSITION}
        worldRotation={BOOK_ROTATION}
      />
    </>
  );
}
