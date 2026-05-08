import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { MainScene } from '../scenes/MainScene';
import { BookData } from '../types/BookData';
import { BookMesh } from '../components/Bookshelf/BookMesh';
import { Book } from '../components/Bookshelf/Book';
import { Bookshelf } from '../components/Bookshelf/Bookshelf';

interface BookshelfSceneInnerProps {
    mainScene: MainScene;
    isVRSupported: boolean;
    books: BookData[];
}

export function BookshelfSceneInner({ mainScene, isVRSupported, books }: BookshelfSceneInnerProps) {
    const { scene, gl } = useThree();
    const readyRef = useRef(false);
    const rafRef = useRef<number>(0);
    const bookInstancesRef = useRef<(Book | null)[]>([]);
    const [bookshelf, setBookshelf] = useState<Bookshelf | null>(null);

    useEffect(() => {
        mainScene.setupScene(gl, scene).then(() => {
            mainScene.initialize(isVRSupported);
            readyRef.current = true;
            setBookshelf(mainScene.getBookshelf());
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

    const positions = bookshelf
        ? bookshelf.computePositions(books.map(b => Book.getOuterSizeForParams(b.params)))
        : [];

    const syncBooks = () => {
        mainScene.setBooks(bookInstancesRef.current.filter((b): b is Book => b !== null));
    };

    return (
        <>
            <Stats />
            {bookshelf && (
                <primitive object={bookshelf.getMesh()}>
                    {books.map((b, i) => positions[i] && (
                        <BookMesh
                            key={b.id}
                            data={b}
                            position={positions[i]!}
                            onReady={book => { bookInstancesRef.current[i] = book; syncBooks(); }}
                            onUnmount={() => { bookInstancesRef.current[i] = null; syncBooks(); }}
                        />
                    ))}
                </primitive>
            )}
        </>
    );
}
