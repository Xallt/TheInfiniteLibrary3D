import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Book, BookMeshParams } from '../components/Bookshelf/Book';
import { BookTexture } from '../components/Bookshelf/BookTexture';

interface BookDesignSceneProps {
    bookTextures: BookTexture[];
    bookParams: BookMeshParams;
}

export function BookDesignScene({ bookTextures, bookParams }: BookDesignSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const booksRef = useRef<Book[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        sceneRef.current = scene;

        // Initialize camera
        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 2;
        cameraRef.current = camera;

        // Initialize renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight, false);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Initialize controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(2, 20);
        scene.add(gridHelper);

        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current || !camera || !renderer) return;

            camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        // Animation loop
        const animate = () => {
            if (!scene || !camera || !renderer || !controls) return;

            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            scene.clear();
            controls.dispose();
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, []); // Empty dependency array - only run once on mount

    // Effect for handling book textures
    useEffect(() => {
        if (!sceneRef.current) return;

        // Clear existing books
        booksRef.current.forEach(book => {
            if (book.getMesh()?.parent) {
                book.getMesh()?.parent?.remove(book.getMesh());
            }
        });
        booksRef.current = [];

        // Add new books
        bookTextures.forEach((texture, index) => {
            const book = Book.empty(bookParams, texture, 1, index);
            const bookMesh = book.getMesh();
            bookMesh.position.set(index * 0.5 - (bookTextures.length - 1) * 0.25, 0, 0);
            sceneRef.current!.add(bookMesh);
            booksRef.current.push(book);
        });

        // Adjust camera if needed
        if (bookTextures.length > 0 && cameraRef.current) {
            cameraRef.current.position.z = Math.max(2, bookTextures.length * 0.5);
            if (controlsRef.current) {
                controlsRef.current.update();
            }
        }
    }, [bookTextures, bookParams]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    );
} 