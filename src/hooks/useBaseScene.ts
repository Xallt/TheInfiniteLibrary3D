import { RefObject, useEffect, useRef } from 'react';
import { BaseScene, BaseSceneCallbacks, BaseSceneOptions, buildBaseScene } from '../scenes/BaseScene';

export function useBaseScene(
    containerRef: RefObject<HTMLElement | null>,
    callbacks: BaseSceneCallbacks,
    options: BaseSceneOptions,
    onReady?: (base: BaseScene) => void
): RefObject<BaseScene | null> {
    const baseRef = useRef<BaseScene | null>(null);
    const callbacksRef = useRef(callbacks);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const base = buildBaseScene(callbacksRef.current);
        baseRef.current = base;

        base.init(container, options).then(() => {
            onReadyRef.current?.(base);
        });

        return () => {
            base.renderer.dispose();
            container.innerHTML = '';
            baseRef.current = null;
        };
    }, []);

    return baseRef;
}
