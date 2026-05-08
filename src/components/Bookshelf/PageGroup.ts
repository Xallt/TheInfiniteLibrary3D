import { useRef, useState } from "react";
import * as THREE from "three";
import { buildPage, Page, PageProps } from "./Page";

export function usePageGroup(numPages: number) {
  const pages = useRef<(Page | null)[]>(new Array(numPages).fill(null));
  const [pageEntries, setPageEntries] = useState<Array<{ id: string; mesh: THREE.Group } | null>>(
    new Array(numPages).fill(null)
  );

  function numPagesFn(): number {
    return pages.current.length;
  }
  function setPageTransform(index: number, rotation: THREE.Euler, position: THREE.Vector3): void {
    pages.current[index]!.setPageTransform(rotation, position);
  }
  function updatePageTransform(
    index: number,
    transformUpdate: (
      rotation: THREE.Euler,
      transform: THREE.Vector3
    ) => { rotation: THREE.Euler; transform: THREE.Vector3 }
  ): void {
    pages.current[index]!.updatePageTransform(transformUpdate);
  }
  function exists(index: number): boolean {
    return pages.current[index] !== null;
  }
  function createPage(
    pageProps: PageProps,
    index: number,
    initialRotation: THREE.Euler,
    initialPosition: THREE.Vector3
  ): void {
    const page = buildPage(pageProps, initialRotation, initialPosition);
    pages.current[index] = page;
    setPageEntries((prev) => {
      const next = [...prev];
      next[index] = { id: page.id, mesh: page.mesh };
      return next;
    });
  }
  function resize(newSize: number): void {
    pages.current = new Array(newSize).fill(null);
    setPageEntries(new Array(newSize).fill(null));
  }

  return {
    numPages: numPagesFn,
    setPageTransform,
    updatePageTransform,
    createPage: createPage,
    exists,
    resize,
    pageEntries,
  };
}

export type PageGroup = ReturnType<typeof usePageGroup>;
