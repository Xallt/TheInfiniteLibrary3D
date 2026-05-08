import { Stats } from '@react-three/drei';
import { useEffect } from 'react';
import { BookshelfMesh } from '../components/Bookshelf/BookshelfMesh';
import { defaultBookshelfParams, defaultBookshelfTexturePath } from '../config/bookConfig';
import { useMainScene, MainScene } from '../scenes/MainScene';
import { BookData } from '../types/BookData';

interface BookshelfSceneInnerProps {
    books: BookData[];
    onMainSceneReady: (mainScene: MainScene) => void;
}

export function BookshelfSceneInner({ books, onMainSceneReady }: BookshelfSceneInnerProps) {
    const mainScene = useMainScene();

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
