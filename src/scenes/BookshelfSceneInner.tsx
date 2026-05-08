import { Stats } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { BookshelfMesh } from "../components/Bookshelf/BookshelfMesh";
import { BookOpeningState } from "../components/Bookshelf/Book";
import { BookPageInput } from "../components/Bookshelf/BookComponent";
import { defaultBookshelfParams, defaultBookshelfTexturePath } from "../config/bookConfig";
import { defaultMainSceneConfig } from "../config/mainSceneConfig";
import { buildCamera, buildControls, SCENE_ELEVATION } from "./MainScene";
import { SceneSetup } from "./SceneSetup";
import { BookData } from "../types/BookData";

interface BookshelfSceneInnerProps {
  books: BookData[];
  pagesByBook: Record<string, BookPageInput[]>;
  selectedBookIndex: number | null;
  viewingBookIndex: number | null;
  viewingOpeningState: BookOpeningState;
  onBookHover: (i: number | null) => void;
  onBookClick: (i: number) => void;
}

const VIEW_CENTER = new THREE.Vector3(0, SCENE_ELEVATION, 0.5);
const VIEW_ROTATION = new THREE.Euler(0, 0, 0);
const SHELF_ROTATION = new THREE.Euler(0, Math.PI, 0);
const HOVER_PERK = 0.05;

export function BookshelfSceneInner(props: BookshelfSceneInnerProps) {
  const { gl: renderer, set } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(buildCamera());
  const controlsRef = useRef<OrbitControls>(buildControls(cameraRef.current, renderer));

  useEffect(() => {
    set({ camera: cameraRef.current });
  }, [set]);

  useFrame(() => {
    controlsRef.current.update();
  });

  useEffect(() => {
    if (props.viewingBookIndex !== null) {
      controlsRef.current.target.copy(VIEW_CENTER);
    } else {
      controlsRef.current.target.set(0, SCENE_ELEVATION, 0);
    }
  }, [props.viewingBookIndex]);

  return (
    <>
      <Stats />
      <SceneSetup config={defaultMainSceneConfig} />
      <primitive object={controlsRef.current} />
      <BookshelfMesh
        params={defaultBookshelfParams}
        texturePath={defaultBookshelfTexturePath}
        books={props.books}
        pagesByBook={props.pagesByBook}
        selectedBookIndex={props.selectedBookIndex}
        viewingBookIndex={props.viewingBookIndex}
        viewingOpeningState={props.viewingOpeningState}
        onBookHover={props.onBookHover}
        onBookClick={props.onBookClick}
        viewCenter={VIEW_CENTER}
        viewRotation={VIEW_ROTATION}
        shelfRotation={SHELF_ROTATION}
        hoverPerk={HOVER_PERK}
      />
    </>
  );
}
