import { Stats } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { BookshelfMesh } from '../components/Bookshelf/BookshelfMesh';
import { defaultBookshelfParams, defaultBookshelfTexturePath } from '../config/bookConfig';
import { defaultMainSceneConfig } from '../config/mainSceneConfig';
import { buildMainScene, MainScene } from '../scenes/MainScene';
import { BookData } from '../types/BookData';

interface BookshelfSceneInnerProps {
    books: BookData[];
    onMainSceneReady: (mainScene: MainScene) => void;
}

export function BookshelfSceneInner({ books, onMainSceneReady }: BookshelfSceneInnerProps) {
    const { scene, gl } = useThree();
    const readyRef = useRef(false);
    const rafRef = useRef<number>(0);
    const mainSceneRef = useRef<MainScene | null>(null);

    if (!mainSceneRef.current) {
        mainSceneRef.current = buildMainScene(defaultMainSceneConfig, gl, scene);
    }
    const mainScene = mainSceneRef.current;

    useEffect(() => {
        onMainSceneReady(mainScene);

        mainScene.actions.setupScene().then(() => {
            readyRef.current = true;
        });

        function tick() {
            rafRef.current = requestAnimationFrame(tick);
            if (!readyRef.current) return;
            mainScene.actions.updateLogic();
            gl.render(scene, mainScene.state.camera);
        }
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafRef.current);
            readyRef.current = false;
            mainScene.actions.dispose();
        };
    // mainScene is stable (created once via ref), gl/scene are stable r3f refs
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
