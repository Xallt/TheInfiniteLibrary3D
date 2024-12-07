export abstract class BaseScene {
    protected async init(container: HTMLElement): Promise<void> {
        await this.initRenderer(container);
        await this.initScene();
        await this.initCamera();
        await this.initLighting();
        await this.initControls();
    }

    protected abstract initRenderer(container: HTMLElement): Promise<void>;
    protected abstract initScene(): Promise<void>;
    protected abstract initCamera(): Promise<void>;
    protected abstract initLighting(): Promise<void>;
    protected abstract initControls(): Promise<void>;
}
