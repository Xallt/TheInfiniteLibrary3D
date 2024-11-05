import * as THREE from 'three';

export interface BookTextureParams {
    leftCoverPosition: number;  // Position in normalized coordinates (0-1)
    rightCoverPosition: number; // Position in normalized coordinates (0-1)
}

export class BookTexture {
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

    public generateCoverUVCoordinates(): THREE.Vector2[] {
        // UV coordinates for the front cover (middle section)
        return [
            new THREE.Vector2(this.params.leftCoverPosition, 0),  // bottom left
            new THREE.Vector2(this.params.rightCoverPosition, 0), // bottom right
            new THREE.Vector2(this.params.leftCoverPosition, 1),  // top left
            new THREE.Vector2(this.params.rightCoverPosition, 1), // top right
        ];
    }

    public generateLeftCoverUVCoordinates(): THREE.Vector2[] {
        // UV coordinates for the left cover section
        return [
            new THREE.Vector2(0, 0),                           // bottom left
            new THREE.Vector2(this.params.leftCoverPosition, 0), // bottom right
            new THREE.Vector2(0, 1),                           // top left
            new THREE.Vector2(this.params.leftCoverPosition, 1), // top right
        ];
    }

    public generateRightCoverUVCoordinates(): THREE.Vector2[] {
        // UV coordinates for the right cover section
        return [
            new THREE.Vector2(this.params.rightCoverPosition, 0), // bottom left
            new THREE.Vector2(1, 0),                            // bottom right
            new THREE.Vector2(this.params.rightCoverPosition, 1), // top left
            new THREE.Vector2(1, 1),                            // top right
        ];
    }
} 