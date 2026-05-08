import React, { useEffect, useRef, useState } from "react";
import { BookTexture, BookTextureParams } from "./Bookshelf/BookTexture";
import { defaultBookParams } from "../config/bookConfig";
import * as THREE from "three";
import { PDFSelectionModal } from "./PDFSelectionModal";
import { PDFResource } from "../types/PDFResource";
import { BookDesignScene } from "../scenes/BookDesignScene";

type SelectionState = "left" | "right" | "complete";
type ViewMode = "2d" | "3d";

export function BookDesignStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [texture, setTexture] = useState<HTMLImageElement | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [coverPositions, setCoverPositions] = useState<BookTextureParams>({
    leftCoverPosition: 0,
    rightCoverPosition: 0,
  });
  const [selectionState, setSelectionState] = useState<SelectionState>("left");
  const [imageMetrics, setImageMetrics] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [bookTextures, setBookTextures] = useState<BookTexture[]>([]);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<PDFResource | null>(null);

  const canSubmitTexture = texture && selectionState === "complete";

  useEffect(() => {
    if (viewMode !== "2d") return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    contextRef.current = context;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "2d") drawCanvas();
  }, [texture, mouseX, coverPositions, selectionState, viewMode]);

  const calculateImageMetrics = (canvas: HTMLCanvasElement, texture: HTMLImageElement) => {
    const scale = Math.min(canvas.width / texture.width, canvas.height / texture.height) * 0.8;
    const width = texture.width * scale;
    const height = texture.height * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    return { x, y, width, height };
  };

  const drawCanvas = () => {
    if (!contextRef.current || !canvasRef.current) return;

    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (texture) {
      const metrics = calculateImageMetrics(canvas, texture);
      setImageMetrics(metrics);
      const { x, y, width, height } = metrics;

      ctx.drawImage(texture, x, y, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      if (coverPositions.leftCoverPosition !== null) {
        drawPositionLine(
          ctx,
          x + coverPositions.leftCoverPosition * width,
          y,
          height,
          "rgba(100,180,255,0.8)",
          "Left Cover"
        );
      }
      if (coverPositions.rightCoverPosition !== null) {
        drawPositionLine(
          ctx,
          x + coverPositions.rightCoverPosition * width,
          y,
          height,
          "rgba(100,180,255,0.8)",
          "Right Cover"
        );
      }

      if (mouseX !== null && mouseX >= x && mouseX <= x + width && selectionState !== "complete") {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(mouseX, y);
        ctx.lineTo(mouseX, y + height);
        ctx.strokeStyle = "rgba(255,200,50,0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        const normalizedPosition = ((mouseX - x) / width).toFixed(3);
        ctx.fillStyle = "rgba(255,200,50,0.9)";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(`Select ${selectionState} cover: ${normalizedPosition}`, mouseX + 8, y + 20);
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load a texture to begin", canvas.width / 2, canvas.height / 2);
    }
  };

  const drawPositionLine = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    color: string,
    label: string
  ) => {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(label, x + 4, y + 14);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !texture || selectionState === "complete") return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMouseX(event.clientX - rect.left);
  };

  const handleMouseLeave = () => setMouseX(null);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageMetrics || !texture || selectionState === "complete") return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    if (clickX >= imageMetrics.x && clickX <= imageMetrics.x + imageMetrics.width) {
      const normalizedPosition = (clickX - imageMetrics.x) / imageMetrics.width;

      if (selectionState === "left") {
        setCoverPositions((prev) => ({ ...prev, leftCoverPosition: normalizedPosition }));
        setSelectionState("right");
      } else if (selectionState === "right") {
        setCoverPositions((prev) => ({ ...prev, rightCoverPosition: normalizedPosition }));
        setSelectionState("complete");
      }
    }
  };

  const handleReset = () => {
    setCoverPositions({ leftCoverPosition: 0, rightCoverPosition: 0 });
    setSelectionState("left");
  };

  const handleTextureLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setTexture(img);
        handleReset();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleViewMode = () => setViewMode((prev) => (prev === "2d" ? "3d" : "2d"));

  const handlePDFSelected = (sources: PDFResource[]) => {
    if (sources.length > 0) setSelectedPDF(sources[0]);
    setIsPDFModalOpen(false);
  };

  const handleSubmitTexture = () => {
    if (!canSubmitTexture || !texture || !selectedPDF) {
      throw new Error("Texture is not loaded or PDF is not selected");
    }

    const threeTexture = new THREE.Texture(texture);
    threeTexture.needsUpdate = true;

    const bookTexture = new BookTexture(threeTexture, coverPositions);
    setBookTextures((prev) => [...prev, bookTexture]);
    setViewMode("3d");
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {viewMode === "2d" ? (
        <canvas
          key="canvas-2d"
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
        />
      ) : (
        <div style={{ width: "100%", height: "100%" }}>
          <BookDesignScene
            bookTextures={bookTextures}
            bookParams={defaultBookParams}
            pdfResource={selectedPDF}
          />
        </div>
      )}

      <div className="controls-panel panel">
        <button
          className={`panel-btn ${viewMode === "3d" ? "active" : ""}`}
          onClick={toggleViewMode}
        >
          {viewMode === "2d" ? "3D View" : "2D View"}
        </button>

        {viewMode === "2d" && (
          <>
            <label htmlFor="texture-upload" className="panel-btn" style={{ cursor: "pointer" }}>
              Load Texture
              <input
                type="file"
                id="texture-upload"
                accept="image/*"
                onChange={handleTextureLoad}
                style={{ display: "none" }}
              />
            </label>
            {texture && (
              <>
                <button className="panel-btn" onClick={() => setTexture(null)}>
                  Clear Texture
                </button>
                <button className="panel-btn" onClick={handleReset}>
                  Reset Positions
                </button>
              </>
            )}
            {canSubmitTexture && (
              <button className="panel-btn" onClick={handleSubmitTexture}>
                Create 3D Book
              </button>
            )}
          </>
        )}

        <hr className="panel-divider" />

        <button className="panel-btn" onClick={() => setIsPDFModalOpen(true)}>
          {selectedPDF ? "Change PDF" : "Select PDF"}
        </button>
        {selectedPDF && (
          <>
            <span className="panel-label">Selected PDF</span>
            <span className="panel-text">{selectedPDF.getDisplayName()}</span>
            <button className="panel-btn" onClick={() => setSelectedPDF(null)}>
              Clear PDF
            </button>
          </>
        )}

        {viewMode === "2d" && selectionState === "complete" && (
          <>
            <hr className="panel-divider" />
            <span className="panel-label">Cover Positions</span>
            <span className="panel-text">Left: {coverPositions.leftCoverPosition.toFixed(3)}</span>
            <span className="panel-text">
              Right: {coverPositions.rightCoverPosition.toFixed(3)}
            </span>
          </>
        )}
      </div>

      <PDFSelectionModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onPDFSourcesSubmitted={handlePDFSelected}
        singleBookMode={true}
      />
    </div>
  );
}
