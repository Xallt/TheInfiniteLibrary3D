import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Book, BookMeshParams } from '../components/Bookshelf/Book';
import { BookTexture } from '../components/Bookshelf/BookTexture';
import { Page } from '../components/Bookshelf/Page';
import { PDFResource } from '../types/PDFResource';
import { BookStateControlsUI } from '../components/BookStateControlsUI';
import { BaseSceneCallbacks } from './BaseScene';
import { useBaseScene } from '../hooks/useBaseScene';

interface BookDesignSceneProps {
    bookTextures: BookTexture[];
    bookParams: BookMeshParams;
    pdfResource: PDFResource | null;
}

export function BookDesignScene({ bookTextures, bookParams, pdfResource }: BookDesignSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const booksRef = useRef<Book[]>([]);
    const loadedPdfRef = useRef<PDFResource | null>(null);
    const [currentBook, setCurrentBook] = useState<Book | null>(null);

    const callbacks = useMemo<BaseSceneCallbacks>(() => ({
        setupScene: async (renderer, scene) => {
            const container = containerRef.current;
            if (!container) return;

            renderer.setSize(container.clientWidth, container.clientHeight, false);
            scene.background = new THREE.Color(0xf0f0f0);

            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.z = 2;
            cameraRef.current = camera;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controlsRef.current = controls;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);

            scene.add(new THREE.GridHelper(2, 20));
        },
        onAnimate: (renderer, scene) => {
            controlsRef.current?.update();
            if (cameraRef.current) renderer.render(scene, cameraRef.current);
        },
    }), []);

    const baseRef = useBaseScene(containerRef, callbacks, { showStats: false });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleResize = () => {
            const camera = cameraRef.current;
            if (!camera) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            baseRef.current?.renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            controlsRef.current?.dispose();
        };
    }, []);

    useEffect(() => {
        const scene = baseRef.current?.scene;
        if (!scene) return;

        booksRef.current.forEach(book => {
            book.getMesh().parent?.remove(book.getMesh());
        });
        booksRef.current = [];

        bookTextures.forEach(async (texture, index) => {
            const book = Book.empty(bookParams, texture, 1, index);
            const bookMesh = book.getMesh();
            bookMesh.position.set(index * 0.5 - (bookTextures.length - 1) * 0.25, 0, 0);
            scene.add(bookMesh);
            booksRef.current.push(book);

            if (index === 0) {
                setCurrentBook(book);
            }

            if (pdfResource && pdfResource !== loadedPdfRef.current) {
                try {
                    const parseResult = await pdfResource.getParsedPDF({ imageFormat: 'png', scale: 2.0 });
                    const actualPageCount = Math.ceil(parseResult.metadata.numPages / 2);
                    book.resizePageArray(actualPageCount);

                    let pageIndex = 0;
                    for await (const [frontPage, backPage] of parseResult.getPairedPages()) {
                        const physicalPage = Page.fromPdfPages(frontPage, backPage, Page.getPageParams(book.getParams()));
                        book.addPage(physicalPage, pageIndex++);
                    }

                    loadedPdfRef.current = pdfResource;
                } catch (error) {
                    console.error('Failed to load book pages:', error);
                }
            }
        });

        if (bookTextures.length > 0 && cameraRef.current) {
            cameraRef.current.position.z = Math.max(2, bookTextures.length * 0.5);
            controlsRef.current?.update();
        }
    }, [bookTextures, bookParams, pdfResource]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            {currentBook && (
                <div className="book-controls-overlay">
                    <BookStateControlsUI
                        book={currentBook}
                        controllers={[]}
                    />
                </div>
            )}
        </div>
    );
}
