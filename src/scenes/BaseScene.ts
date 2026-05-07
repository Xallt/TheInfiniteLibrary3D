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
    protected async initRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer> {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        this.initXR();


        renderer.setAnimationLoop(this.animate.bind(this));
        container.appendChild(renderer.domElement);
        return renderer;
    }

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

    protected abstract setupVRControllers(
        leftController: THREE.XRTargetRaySpace,
        rightController: THREE.XRTargetRaySpace
    ): void;

    /**
     * Initialize XR support
     */
    protected initXR(): void {
        if (this.isVRSupported) {
            // Add VR session change handlers
            this.renderer.xr.addEventListener('sessionstart', () => {
                const xrManager = this.renderer.xr;
                const baseReferenceSpace = xrManager.getReferenceSpace();

                if (baseReferenceSpace) {
                    const quaternion = new THREE.Quaternion();

                    // Create transform from current camera position and rotation
                    const transform = new XRRigidTransform(
                        { x: -this.camera.position.x, y: -this.camera.position.y + 1, z: -this.camera.position.z },
                        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
                    );

                    // Apply transform to reference space
                    const referenceSpace = baseReferenceSpace.getOffsetReferenceSpace(transform);
                    xrManager.setReferenceSpace(referenceSpace);
                }
            });

            // Initialize VR controllers
            this.setupVRControllers(this.renderer.xr.getController(0), this.renderer.xr.getController(1));
        }
    }
}
