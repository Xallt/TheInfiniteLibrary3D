import React, { useEffect, useRef, useState } from 'react';
import { BookDesignScene } from '../scenes/BookDesignScene';
import { BookTexture, BookTextureParams } from './Bookshelf/BookTexture';
import { defaultBookParams } from '../App';
import * as THREE from 'three';

type SelectionState = 'left' | 'right' | 'complete';
type ViewMode = '2d' | '3d';

export function BookDesignStudio() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [texture, setTexture] = useState<HTMLImageElement | null>(null);
    const [mouseX, setMouseX] = useState<number | null>(null);
    const [coverPositions, setCoverPositions] = useState<BookTextureParams>({
        leftCoverPosition: 0,
        rightCoverPosition: 0
    });
    const [selectionState, setSelectionState] = useState<SelectionState>('left');
    const [imageMetrics, setImageMetrics] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('2d');
    const sceneRef = useRef<BookDesignScene | null>(null);

    const canSubmitTexture = texture && selectionState === 'complete';

    useEffect(() => {
        const container = document.querySelector('.threejs-container');
        if (container) {
            sceneRef.current = new BookDesignScene(container as HTMLElement);
        }

        return () => {
            if (sceneRef.current) {
                sceneRef.current.dispose();
                sceneRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (viewMode === '2d') {
            if (!canvasRef.current) return;

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
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
            window.addEventListener('resize', resizeCanvas);

            return () => {
                window.removeEventListener('resize', resizeCanvas);
            };
        }
    }, [viewMode]);

    useEffect(() => {
        if (viewMode === '2d') {
            drawCanvas();
        }
    }, [texture, mouseX, coverPositions, selectionState, viewMode]);

    const calculateImageMetrics = (canvas: HTMLCanvasElement, texture: HTMLImageElement) => {
        const scale = Math.min(
            canvas.width / texture.width,
            canvas.height / texture.height
        ) * 0.8;

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

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (texture) {
            const metrics = calculateImageMetrics(canvas, texture);
            setImageMetrics(metrics);
            const { x, y, width, height } = metrics;

            // Draw the texture
            ctx.drawImage(texture, x, y, width, height);
            
            // Draw border around the texture
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw saved positions
            if (coverPositions.leftCoverPosition !== null) {
                const leftX = x + (coverPositions.leftCoverPosition * width);
                drawPositionLine(ctx, leftX, y, height, '#0000FF', 'Left Cover');
            }
            
            if (coverPositions.rightCoverPosition !== null) {
                const rightX = x + (coverPositions.rightCoverPosition * width);
                drawPositionLine(ctx, rightX, y, height, '#0000FF', 'Right Cover');
            }

            // Draw current guide line if not complete
            if (mouseX !== null && mouseX >= x && mouseX <= x + width && selectionState !== 'complete') {
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(mouseX, y);
                ctx.lineTo(mouseX, y + height);
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);

                const normalizedPosition = ((mouseX - x) / width).toFixed(3);
                ctx.fillStyle = '#FF0000';
                ctx.font = '14px Arial';
                ctx.fillText(
                    `Select ${selectionState} cover position: ${normalizedPosition}`,
                    mouseX,
                    y - 25
                );
            }
        } else {
            ctx.fillStyle = '#333333';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Load a texture to begin', canvas.width / 2, canvas.height / 2);
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
        ctx.font = '14px Arial';
        ctx.fillText(label, x, y - 10);
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !texture || selectionState === 'complete') return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        setMouseX(mouseX);
    };

    const handleMouseLeave = () => {
        setMouseX(null);
    };

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!imageMetrics || !texture || selectionState === 'complete') return;

        const rect = canvasRef.current!.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        
        if (clickX >= imageMetrics.x && clickX <= imageMetrics.x + imageMetrics.width) {
            const normalizedPosition = (clickX - imageMetrics.x) / imageMetrics.width;
            
            if (selectionState === 'left') {
                setCoverPositions(prev => ({
                    ...prev,
                    leftCoverPosition: normalizedPosition
                }));
                setSelectionState('right');
            } else if (selectionState === 'right') {
                setCoverPositions(prev => ({
                    ...prev,
                    rightCoverPosition: normalizedPosition
                }));
                setSelectionState('complete');
            }
        }
    };

    const handleReset = () => {
        setCoverPositions({
            leftCoverPosition: 0,
            rightCoverPosition: 0
        });
        setSelectionState('left');
    };

    const handleTextureLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setTexture(img);
                handleReset(); // Reset positions when new texture is loaded
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const toggleViewMode = () => {
        setViewMode(prev => prev === '2d' ? '3d' : '2d');
    };

    const handleSubmitTexture = () => {
        if (!canSubmitTexture || !texture) {
            throw new Error('Texture is not loaded or not complete');
        }

        if (!sceneRef.current) {
            throw new Error('Scene is not initialized');
        }

        // Create Three.js texture
        const threeTexture = new THREE.Texture(texture);
        threeTexture.needsUpdate = true;

        // Create BookTexture instance
        const bookTexture = new BookTexture(threeTexture, coverPositions);

        // Pass the BookTexture instance to the scene
        sceneRef.current.addBook(bookTexture, defaultBookParams);
        setViewMode('3d'); // Switch to 3D view after adding
    };

    return (
        <div className="book-design-studio">
            <div className="studio-layout">
                <div className="side-controls">
                    <h3>Design Controls</h3>
                    <div className="control-group">
                        <button 
                            className={`view-mode-button ${viewMode === '3d' ? 'active' : ''}`}
                            onClick={toggleViewMode}
                        >
                            {viewMode === '2d' ? 'Switch to 3D View' : 'Switch to 2D View'}
                        </button>
                        {viewMode === '2d' && (
                            <>
                                <label htmlFor="texture-upload" className="button-like">
                                    Load Texture
                                    <input
                                        type="file"
                                        id="texture-upload"
                                        accept="image/*"
                                        onChange={handleTextureLoad}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                {texture && (
                                    <>
                                        <button 
                                            onClick={() => setTexture(null)}
                                            className="clear-button"
                                        >
                                            Clear Texture
                                        </button>
                                        <button 
                                            onClick={handleReset}
                                            className="clear-button"
                                        >
                                            Reset Positions
                                        </button>
                                    </>
                                )}
                                {canSubmitTexture && (
                                    <button 
                                        className="submit-button"
                                        onClick={handleSubmitTexture}
                                    >
                                        Create 3D Book
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {viewMode === '2d' && selectionState === 'complete' && (
                        <div className="positions-display">
                            <p>Left Cover: {coverPositions.leftCoverPosition.toFixed(3)}</p>
                            <p>Right Cover: {coverPositions.rightCoverPosition.toFixed(3)}</p>
                        </div>
                    )}
                </div>
                <div className="scene-container">
                    {viewMode === '2d' ? (
                        <canvas 
                            key={`canvas-${viewMode}`}
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onClick={handleCanvasClick}
                        />
                    ) : null}
                    <div 
                        className="threejs-container" 
                        style={{ display: viewMode === '3d' ? 'block' : 'none' }}
                    />
                </div>
            </div>
        </div>
    );
} 