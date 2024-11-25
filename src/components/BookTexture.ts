import * as THREE from 'three';

export interface BookTextureParams {
    leftCoverPosition: number;  // Position in normalized coordinates (0-1)
    rightCoverPosition: number; // Position in normalized coordinates (0-1)
}

export class BookTexture {
    private static readonly UV_OFFSET = 0.1;
    private texture: THREE.Texture;
    private params: BookTextureParams;

    constructor(texture: THREE.Texture, params: BookTextureParams) {
        this.texture = texture;
        this.params = params;

        // Ensure the texture wrapping is set to ClampToEdge
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;
    }

    public getTexture(): THREE.Texture {
        return this.texture;
    }

    /**
     * Returns UV coordinates for the front cover (spine) of the book
     */
    public getSpineUVs(): number[] {
        return [
            this.params.leftCoverPosition, 0,  // bottom left
            this.params.rightCoverPosition, 0, // bottom right
            this.params.leftCoverPosition, 1,  // top left
            this.params.rightCoverPosition, 1  // top right
        ];
    }

    /**
     * Returns UV coordinates for the left side of the book
     */
    public getLeftSideUVs(): number[] {
        return [
            0, 0,                              // bottom left
            this.params.leftCoverPosition, 0,  // bottom right
            0, 1,                              // top left
            this.params.leftCoverPosition, 1   // top right
        ];
    }

    /**
     * Returns UV coordinates for the right side of the book
     */
    public getRightSideUVs(): number[] {
        return [
            this.params.rightCoverPosition, 0, // bottom left
            1, 0,                             // bottom right
            this.params.rightCoverPosition, 1, // top left
            1, 1                              // top right
        ];
    }

    /**
     * Returns UV coordinates for the top side of the book
     * This will stretch/tile the edge of the texture
     */
    public getSpineTopSideUVs(): number[] {
        return [
            this.params.leftCoverPosition, -BookTexture.UV_OFFSET,  // bottom left
            this.params.rightCoverPosition, -BookTexture.UV_OFFSET, // bottom right
            this.params.leftCoverPosition, 0,  // top left
            this.params.rightCoverPosition, 0  // top right
        ];
    }

    public getSpineBottomSideUVs(): number[] {
        return [
            this.params.leftCoverPosition, 1,  // bottom left
            this.params.rightCoverPosition, 1, // bottom right
            this.params.leftCoverPosition, 1 + BookTexture.UV_OFFSET,  // top left
            this.params.rightCoverPosition, 1 + BookTexture.UV_OFFSET  // top right
        ];
    }

    public getLeftSideTopUVs(): number[] {
        return [
            0, -BookTexture.UV_OFFSET,
            this.params.leftCoverPosition, -BookTexture.UV_OFFSET,
            0, 0,
            this.params.leftCoverPosition, 0
        ];
    }

    public getRightSideTopUVs(): number[] {
        return [
            this.params.rightCoverPosition, -BookTexture.UV_OFFSET,
            1, -BookTexture.UV_OFFSET,
            this.params.rightCoverPosition, 0,
            1, 0
        ];
    }

    public getRightSideBottomUVs(): number[] {
        return [
            this.params.rightCoverPosition, 1,
            1, 1,
            this.params.rightCoverPosition, 1 + BookTexture.UV_OFFSET,
            1, 1 + BookTexture.UV_OFFSET
        ];
    }

    public getLeftSideBottomUVs(): number[] {
        return [
            0, 1,
            this.params.leftCoverPosition, 1,
            0, 1 + BookTexture.UV_OFFSET,
            this.params.leftCoverPosition, 1 + BookTexture.UV_OFFSET
        ];
    }

    public getLeftLeftUVs(): number[] {
        return [
            -BookTexture.UV_OFFSET, 0,
            0, 0,
            -BookTexture.UV_OFFSET, 1,
            0, 1
        ];
    }

    public getRightRightUVs(): number[] {
        return [
            1, 0,
            1 + BookTexture.UV_OFFSET, 0,
            1, 1,
            1 + BookTexture.UV_OFFSET, 1
        ];
    }

} 