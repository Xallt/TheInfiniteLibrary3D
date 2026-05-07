import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
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
        });
        return () => {
            mainScene.dispose();
        };
    }, []);

    useFrame(() => {
        mainScene.tick();
    });

    return <Stats />;
}
