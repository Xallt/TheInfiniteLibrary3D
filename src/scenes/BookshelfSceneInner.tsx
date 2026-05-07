import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { MainScene } from '../scenes/MainScene';

interface BookshelfSceneInnerProps {
    mainScene: MainScene;
    isVRSupported: boolean;
}

export function BookshelfSceneInner({ mainScene, isVRSupported }: BookshelfSceneInnerProps) {
    const { scene, gl } = useThree();
    const readyRef = useRef(false);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        mainScene.setupScene(gl, scene).then(() => {
            mainScene.initialize(isVRSupported);
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

    return <Stats />;
}
