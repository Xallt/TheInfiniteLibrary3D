import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

export type BaseSceneOptions = {
    showStats: boolean;
    checkVR?: boolean;  // Optional flag to check VR support
}

export abstract class BaseScene {
    protected scene!: THREE.Scene;
    protected renderer!: THREE.WebGLRenderer;
    protected camera!: THREE.PerspectiveCamera;
    protected stats!: Stats;
    protected isVRSupported: boolean = false;

    protected async init(container: HTMLElement, baseSceneOptions: BaseSceneOptions): Promise<void> {
        this.renderer = await this.initRenderer(container);

        // Check VR support if requested
        if (baseSceneOptions.checkVR) {
            await this.checkVRSupport();
            if (this.isVRSupported) {
                await this.initVR(container);
            }
        }

        this.scene = await this.initScene(this.renderer);

        if (baseSceneOptions.showStats) {
            this.stats = this.initStats(this.renderer);
        }
    }

    /**
     * Check if VR is supported
     */
    protected async checkVRSupport(): Promise<void> {
        if ('xr' in navigator && navigator.xr) {
            try {
                this.isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
                console.log('VR Supported:', this.isVRSupported);
            } catch (err) {
                console.warn('VR Support check failed:', err);
                this.isVRSupported = false;
            }
        } else {
            this.isVRSupported = false;
        }
    }

    /**
     * Initialize VR support
     */
    protected async initVR(container: HTMLElement): Promise<void> {
        if (!this.isVRSupported) return;

        this.renderer.xr.enabled = true;

        // Add VR button
        const vrButton = VRButton.createButton(this.renderer);
        container.appendChild(vrButton);

        // Set up VR animation loop
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    /**
     * Initialize the renderer for the scene
     * @param container The HTML element that will contain the renderer
     */
    protected abstract initRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer>;

    /**
     * Initialize the scene with basic setup like camera, lights, etc., and the 3D content itself
     */
    protected async initScene(renderer: THREE.WebGLRenderer): Promise<THREE.Scene> {
        const scene = new THREE.Scene();
        await this.setupScene(renderer, scene);
        return scene;
    }

    /**
     * Setup the scene with the 3D content
     * @param renderer The WebGL renderer
     * @param scene The scene to setup
     */
    protected abstract setupScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void>;

    /**
     * Initialize the stats for the scene
     * @param renderer The renderer to attach the stats to
     */
    private initStats(renderer: THREE.WebGLRenderer): Stats {
        const stats = new Stats();
        stats.dom.style.position = 'absolute';
        renderer.domElement.parentElement?.appendChild(stats.dom);

        return stats;
    }

    /**
     * Animate the scene
     */
    protected animate(): void {
        if (this.stats) {
            this.stats.update();
        }
    }

    /**
     * Check if VR is currently supported
     */
    public isVREnabled(): boolean {
        return this.isVRSupported;
    }
}
