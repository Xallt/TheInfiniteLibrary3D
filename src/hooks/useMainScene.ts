import { useRef, useCallback } from 'react';
import { MainScene } from '../scenes/MainScene';
import { BookshelfParams } from '../components/Bookshelf/Bookshelf';
import { Book } from '../components/Bookshelf/Book';

export function useMainScene(params: BookshelfParams) {
    const mainSceneRef = useRef<MainScene | null>(null);

    if (!mainSceneRef.current) {
        mainSceneRef.current = new MainScene(params);
    }

    const addBook = useCallback((book: Book) => {
        mainSceneRef.current?.addBook(book);
    }, []);

    const viewBook = useCallback((index: number) => {
        mainSceneRef.current?.viewBook(index);
    }, []);

    const returnBookToShelf = useCallback(() => {
        mainSceneRef.current?.returnBookToShelf();
    }, []);

    const getBook = useCallback((index: number) => {
        return mainSceneRef.current?.getBook(index) ?? null;
    }, []);

    const getControllers = useCallback(() => {
        return mainSceneRef.current?.getControllers() ?? [];
    }, []);

    const exportSceneToGLB = useCallback(async () => {
        if (!mainSceneRef.current) throw new Error('Scene not initialized');
        return mainSceneRef.current.exportSceneToGLB();
    }, []);

    const setOnBookSelectedCallback = useCallback((cb: (index: number) => void) => {
        mainSceneRef.current?.setOnBookSelectedCallback(cb);
    }, []);

    const isInVR = useCallback(() => {
        return mainSceneRef.current?.isInVR() ?? false;
    }, []);

    return {
        mainSceneRef,
        addBook,
        viewBook,
        returnBookToShelf,
        getBook,
        getControllers,
        exportSceneToGLB,
        setOnBookSelectedCallback,
        isInVR,
    };
}
