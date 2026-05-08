import React, { useRef } from "react";
import { PDFResource, UploadedPDFResource } from "../types/PDFResource";
import {
  BookMeshParams,
  BookOpeningState,
  PageSelectedState,
  UniformlyOpenedState,
  buildPageSelectedState,
  buildUniformlyOpenedState,
} from "./Bookshelf/Book";

interface Props {
  bookParams: BookMeshParams;
  openingState: BookOpeningState;
  numPages: number;
  pdfResource: PDFResource | null;
  onBookParamsChange: (p: BookMeshParams) => void;
  onOpeningStateChange: (s: BookOpeningState) => void;
  onPdfResourceChange: (r: PDFResource | null) => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <>
      <span className="panel-label">
        {label} <span style={{ opacity: 0.5 }}>{value.toFixed(3)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="angle-slider"
      />
    </>
  );
}

interface UniformOpeningControlsProps {
  state: UniformlyOpenedState;
  onOpeningStateChange: (s: BookOpeningState) => void;
}

function UniformOpeningControls({ state, onOpeningStateChange }: UniformOpeningControlsProps) {
  return (
    <>
      <input
        type="range"
        min={0}
        max={Math.PI / 2}
        step={0.01}
        value={state.angle}
        onChange={(e) =>
          onOpeningStateChange(buildUniformlyOpenedState(parseFloat(e.target.value)))
        }
        className="angle-slider"
      />
      <button
        className="panel-btn"
        onClick={() => onOpeningStateChange(buildPageSelectedState(Math.PI / 2, 0))}
      >
        Read Book
      </button>
    </>
  );
}

interface PageSelectedControlsProps {
  state: PageSelectedState;
  numPages: number;
  onOpeningStateChange: (s: BookOpeningState) => void;
}

function PageSelectedControls({ state, numPages, onOpeningStateChange }: PageSelectedControlsProps) {
  return (
    <>
      <span className="panel-text" style={{ opacity: 0.5 }}>
        Page {state.selectedPageIndex + 1} / {numPages}
      </span>
      <div style={{ display: "flex" }}>
        <button
          className="panel-btn"
          style={{ flex: 1 }}
          onClick={() =>
            onOpeningStateChange(
              buildPageSelectedState(Math.PI / 2, Math.max(state.selectedPageIndex - 1, 0))
            )
          }
        >
          ←
        </button>
        <button
          className="panel-btn"
          style={{ flex: 1 }}
          onClick={() =>
            onOpeningStateChange(
              buildPageSelectedState(
                Math.PI / 2,
                Math.min(state.selectedPageIndex + 1, numPages - 1)
              )
            )
          }
        >
          →
        </button>
      </div>
      <button
        className="panel-btn"
        onClick={() => onOpeningStateChange(buildUniformlyOpenedState(Math.PI / 2))}
      >
        Uniform Open
      </button>
    </>
  );
}

export function BookSandboxControls({
  bookParams,
  openingState,
  numPages,
  pdfResource,
  onBookParamsChange,
  onOpeningStateChange,
  onPdfResourceChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onPdfResourceChange(new UploadedPDFResource(file));
    e.target.value = "";
  }

  function setParam(key: keyof BookMeshParams, value: number) {
    onBookParamsChange({ ...bookParams, [key]: value });
  }

  const isPageSelected = openingState.stateType === "pageSelected";

  return (
    <div
      className="controls-panel panel"
      style={{ maxHeight: "calc(100vh - 24px)", overflowY: "auto" }}
    >
      {/* PDF section */}
      <span className="panel-label">PDF</span>
      <span className="panel-text" style={{ opacity: 0.6, fontSize: 10, wordBreak: "break-all" }}>
        {pdfResource ? pdfResource.getDisplayName() : "No PDF"}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button className="panel-btn" onClick={() => fileInputRef.current?.click()}>
        Change PDF
      </button>
      {pdfResource && (
        <button className="panel-btn" onClick={() => onPdfResourceChange(null)}>
          Drop PDF
        </button>
      )}

      <hr className="panel-divider" />

      {/* Mesh params section */}
      <span className="panel-label">Mesh params</span>
      <SliderRow
        label="thickness"
        value={bookParams.bookThickness}
        min={0.001}
        max={0.05}
        step={0.001}
        onChange={(v) => setParam("bookThickness", v)}
      />
      <SliderRow
        label="width"
        value={bookParams.bookWidth}
        min={0.05}
        max={0.5}
        step={0.005}
        onChange={(v) => setParam("bookWidth", v)}
      />
      <SliderRow
        label="height"
        value={bookParams.bookHeight}
        min={0.05}
        max={0.5}
        step={0.005}
        onChange={(v) => setParam("bookHeight", v)}
      />
      <SliderRow
        label="cover width"
        value={bookParams.coverWidth}
        min={0.001}
        max={0.1}
        step={0.001}
        onChange={(v) => setParam("coverWidth", v)}
      />

      <hr className="panel-divider" />

      {/* Opening state section */}
      <span className="panel-label">Opening</span>
      {!isPageSelected ? (
        <UniformOpeningControls
          state={openingState as UniformlyOpenedState}
          onOpeningStateChange={onOpeningStateChange}
        />
      ) : (
        <PageSelectedControls
          state={openingState as PageSelectedState}
          numPages={numPages}
          onOpeningStateChange={onOpeningStateChange}
        />
      )}
    </div>
  );
}
