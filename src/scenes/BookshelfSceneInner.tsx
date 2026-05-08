import { Stats } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { BookshelfMesh } from '../components/Bookshelf/BookshelfMesh';
import { defaultBookshelfParams, defaultBookshelfTexturePath } from '../config/bookConfig';
import { MainScene } from '../scenes/MainScene';
import { BookData } from '../types/BookData';

interface BookshelfSceneInnerProps {
    mainScene: MainScene;
    books: BookData[];
}

export function BookshelfSceneInner({ mainScene, books }: BookshelfSceneInnerProps) {
    const { scene, gl } = useThree();
    const readyRef = useRef(false);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        mainScene.setupScene(gl, scene).then(() => {
            mainScene.initialize();
            readyRef.current = true;
        }).catch(err => console.error('setupScene failed:', err));

        function tick() {
            rafRef.current = requestAnimationFrame(tick);
            if (!readyRef.current) return;
            mainScene.updateLogic();
            const camera = mainScene.getCamera();
            if (camera) gl.render(scene, camera);
        }
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafRef.current);
            readyRef.current = false;
            mainScene.dispose();
        };
    }, []);

    return (
        <>
            <Stats />
            <BookshelfMesh
                params={defaultBookshelfParams}
                texturePath={defaultBookshelfTexturePath}
                books={books}
                onBooksChanged={books => mainScene.setBooks(books)}
                onMeshReady={mesh => mainScene.setBookshelfMesh(mesh)}
            />
        </>
    );
}
