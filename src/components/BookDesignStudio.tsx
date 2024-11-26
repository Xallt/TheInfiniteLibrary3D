import React, { useEffect, useRef, useState } from 'react';

export function BookDesignStudio() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [texture, setTexture] = useState<HTMLImageElement | null>(null);
    const [mouseX, setMouseX] = useState<number | null>(null);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        drawCanvas();
    }, [texture, mouseX]);

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
            // Calculate dimensions to maintain aspect ratio
            const scale = Math.min(
                canvas.width / texture.width,
                canvas.height / texture.height
            ) * 0.8; // 80% of the container size

            const width = texture.width * scale;
            const height = texture.height * scale;
            const x = (canvas.width - width) / 2;
            const y = (canvas.height - height) / 2;

            // Draw the texture
            ctx.drawImage(texture, x, y, width, height);
            
            // Draw border around the texture
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw vertical guide line if mouse is over the image
            if (mouseX !== null && mouseX >= x && mouseX <= x + width) {
                ctx.beginPath();
                ctx.setLineDash([5, 5]); // Create dashed line
                ctx.moveTo(mouseX, y);
                ctx.lineTo(mouseX, y + height);
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]); // Reset line style

                // Draw normalized position
                const normalizedPosition = ((mouseX - x) / width).toFixed(3);
                ctx.fillStyle = '#FF0000';
                ctx.font = '14px Arial';
                ctx.fillText(`Position: ${normalizedPosition}`, mouseX, y - 10);
            }
        } else {
            // Draw placeholder text
            ctx.fillStyle = '#333333';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Load a texture to begin', canvas.width / 2, canvas.height / 2);
        }
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !texture) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        setMouseX(mouseX);
    };

    const handleMouseLeave = () => {
        setMouseX(null);
    };

    const handleTextureLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setTexture(img);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="book-design-studio">
            <div className="studio-layout">
                <div className="side-controls">
                    <h3>Design Controls</h3>
                    <div className="control-group">
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
                            <button 
                                onClick={() => setTexture(null)}
                                className="clear-button"
                            >
                                Clear Texture
                            </button>
                        )}
                    </div>
                </div>
                <div className="scene-container">
                    <canvas 
                        ref={canvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    />
                </div>
            </div>
        </div>
    );
} 