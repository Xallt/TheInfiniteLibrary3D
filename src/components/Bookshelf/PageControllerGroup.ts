import { useRef, useState } from "react";
import * as THREE from "three";
import { buildPageController, PageController, PageProps } from "./Page";

export function usePageControllerGroup(numPages: number) {
  const pageControllers = useRef<(PageController | null)[]>(new Array(numPages).fill(null));
  const [pageEntries, setPageEntries] = useState<
    Array<{ id: string; mesh: THREE.Group } | null>
  >(new Array(numPages).fill(null));

  function numPagesFn(): number {
    return pageControllers.current.length;
  }
  function setPageTransform(index: number, rotation: THREE.Euler, position: THREE.Vector3): void {
    pageControllers.current[index]!.setPageTransform(rotation, position);
  }
  function updatePageTransform(
    index: number,
    transformUpdate: (
      rotation: THREE.Euler,
      transform: THREE.Vector3
    ) => { rotation: THREE.Euler; transform: THREE.Vector3 }
  ): void {
    pageControllers.current[index]!.updatePageTransform(transformUpdate);
  }
  function exists(index: number): boolean {
    return pageControllers.current[index] !== null;
  }
  function createPageController(
    pageProps: PageProps,
    index: number,
    initialRotation: THREE.Euler,
    initialPosition: THREE.Vector3
  ): void {
    const controller = buildPageController(pageProps, initialRotation, initialPosition);
    pageControllers.current[index] = controller;
    setPageEntries(prev => {
      const next = [...prev];
      next[index] = { id: controller.id, mesh: controller.page.mesh };
      return next;
    });
  }
  function resize(newSize: number): void {
    pageControllers.current = new Array(newSize).fill(null);
    setPageEntries(new Array(newSize).fill(null));
  }

  return {
    numPages: numPagesFn,
    setPageTransform,
    updatePageTransform,
    createPageController,
    exists,
    resize,
    pageEntries,
  };
}

export type PageControllerGroup = ReturnType<typeof usePageControllerGroup>;
