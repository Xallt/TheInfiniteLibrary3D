import { Stats } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BookshelfMesh } from '../components/Bookshelf/BookshelfMesh';
import { defaultBookshelfParams, defaultBookshelfTexturePath } from '../config/bookConfig';
import { defaultMainSceneConfig } from '../config/mainSceneConfig';
import { buildCamera, buildControls, MainScene, useMainScene } from '../scenes/MainScene';
import { BookData } from '../types/BookData';

interface BookshelfSceneInnerProps {
    books: BookData[];
    onMainSceneReady: (mainScene: MainScene) => void;
}

export function BookshelfSceneInner({ books, onMainSceneReady }: BookshelfSceneInnerProps) {
    const { scene, gl: renderer } = useThree();
    const cameraRef = useRef<THREE.PerspectiveCamera>(buildCamera());
    const controlsRef = useRef<OrbitControls>(buildControls(cameraRef.current, renderer));
    const mainScene = useMainScene({ sceneConfig: defaultMainSceneConfig, renderer, scene, camera: cameraRef.current, controls: controlsRef.current });

    useEffect(() => {
        onMainSceneReady(mainScene);
        // mainScene actions are stable closures over refs; only notify parent once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Stats />
            <BookshelfMesh
                params={defaultBookshelfParams}
                texturePath={defaultBookshelfTexturePath}
                books={books}
                onBooksChanged={books => mainScene.actions.setBooks(books)}
                onMeshReady={() => { }}
            />
        </>
    );
}