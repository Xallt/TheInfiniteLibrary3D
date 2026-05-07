import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

export type BaseSceneOptions = {
    showStats: boolean;
    checkVR?: boolean;
};

export interface BaseScene {
    readonly scene: THREE.Scene;
    readonly renderer: THREE.WebGLRenderer;
    readonly isVRSupported: boolean;
    init(container: HTMLElement, options: BaseSceneOptions): Promise<void>;
    isVREnabled(): boolean;
}

export type BaseSceneCallbacks = {
    setupScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void>;
    setupVRControllers?(
        leftController: THREE.XRTargetRaySpace,
        rightController: THREE.XRTargetRaySpace
    ): void;
    onAnimate?(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;
};

export function buildBaseScene(callbacks: BaseSceneCallbacks): BaseScene {
    let scene!: THREE.Scene;
    let renderer!: THREE.WebGLRenderer;
    let stats: Stats | undefined;
    let isVRSupported = false;

    function animate(): void {
        callbacks.onAnimate?.(renderer, scene);
        stats?.update();
    }

    async function checkVRSupport(): Promise<void> {
        if (!('xr' in navigator) || !navigator.xr) {
            isVRSupported = false;
            return;
        }
        try {
            isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
            console.log('VR Supported:', isVRSupported);
        } catch (err) {
            console.warn('VR Support check failed:', err);
            isVRSupported = false;
        }
    }

    async function initRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer> {
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        r.setPixelRatio(window.devicePixelRatio);
        r.setSize(window.innerWidth, window.innerHeight);
        r.setAnimationLoop(animate);
        container.appendChild(r.domElement);
        return r;
    }

    function initStats(r: THREE.WebGLRenderer): Stats {
        const s = new Stats();
        s.dom.style.position = 'absolute';
        r.domElement.parentElement?.appendChild(s.dom);
        return s;
    }

    async function init(container: HTMLElement, options: BaseSceneOptions): Promise<void> {
        renderer = await initRenderer(container);

        if (options.checkVR) {
            await checkVRSupport();
            if (isVRSupported) {
                renderer.xr.enabled = true;
                container.appendChild(VRButton.createButton(renderer));
            }
        }

        scene = new THREE.Scene();
        await callbacks.setupScene(renderer, scene);

        if (isVRSupported && callbacks.setupVRControllers) {
            callbacks.setupVRControllers(
                renderer.xr.getController(0),
                renderer.xr.getController(1)
            );
        }

        if (options.showStats) {
            stats = initStats(renderer);
        }
    }

    return {
        get scene() { return scene; },
        get renderer() { return renderer; },
        get isVRSupported() { return isVRSupported; },
        isVREnabled() { return isVRSupported; },
        init,
    };
}
