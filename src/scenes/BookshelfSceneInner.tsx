import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { MainScene } from '../scenes/MainScene';

interface BookshelfSceneInnerProps {
    mainScene: MainScene;
    isVRSupported: boolean;
}

export function BookshelfSceneInner({ mainScene, isVRSupported }: BookshelfSceneInnerProps) {
    const { scene, gl } = useThree();

    useEffect(() => {
        mainScene.setupScene(gl, scene).then(() => {
            mainScene.initialize(isVRSupported);
            gl.setAnimationLoop(() => mainScene.tick());
        });
        return () => {
            gl.setAnimationLoop(null);
            mainScene.dispose();
        };
    }, []);

    return <Stats />;
}
