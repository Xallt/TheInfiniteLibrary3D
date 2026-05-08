import * as THREE from "three";
import { BookMeshParams, TextureLoader } from "./Book";

export interface PageParams {
  width: number;
  height: number;
}

export interface PageTextures {
  front: string | ImageData | null;
  back: string | ImageData | null;
}

function createTextureFromSource(source: string | ImageData): THREE.Texture {
  if (source instanceof ImageData) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(source, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }
  return TextureLoader.getInstance().load(source);
}

export function createFrontPageGeometry(params: PageParams): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(params.width, params.height);
  g.translate(params.width / 2, 0, 0);
  return g;
}

export function createBackPageGeometry(params: PageParams): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(params.width, params.height);
  g.rotateY(Math.PI);
  g.translate(params.width / 2, 0, 0);
  return g;
}

export function createPageMaterial(
  source: string | ImageData | null
): THREE.MeshLambertMaterial {
  if (!source) {
    return new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.FrontSide });
  }
  return new THREE.MeshLambertMaterial({
    map: createTextureFromSource(source),
    side: THREE.FrontSide,
  });
}

export function getPageParams(bookParams: BookMeshParams): PageParams {
  const { bookThickness, bookWidth, bookHeight } = bookParams;
  const pageWidth = (bookWidth - bookThickness) * 0.95;
  return {
    width: pageWidth,
    height: bookHeight,
  };
}
