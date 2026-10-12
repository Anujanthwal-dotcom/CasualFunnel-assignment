import { useEffect, useRef, useState } from 'react';
import type { HeatmapPoint } from '../types';
import { Badge } from './ui';
import { formatDateTime } from '../lib/format';

export type HeatmapCategory = 'click' | 'heatmap' | 'grid';

export interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  bounds: { width: number; height: number };
  category?: HeatmapCategory;
}

interface HoverState {
  tooltipX: number;
  tooltipY: number;
  canvasX: number;
  canvasY: number;
  origX: number;
  origY: number;
  eventType: string | null;
  nearbyCount: number;
  timestamp?: string;
  snapPoint?: { x: number; y: number } | null;
}

const DEFAULT_FOLD_Y = 768;

export function HeatmapCanvas({
  points,
  bounds,
  category = 'click',
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Re-render when size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setResizeTick((t) => t + 1));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Main canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cssWidth = canvas.clientWidth || 800;
    const aspect = Math.max(bounds.height, 600) / Math.max(bounds.width, 1);
    const cssHeight = Math.max(380, Math.round(cssWidth * aspect));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const scaleX = cssWidth / Math.max(bounds.width, 1);
    const scaleY = cssHeight / Math.max(bounds.height, 1);

    // 1. Plain wireframe canvas (neutral, general to any website)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(191, 193, 183, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 100 * scaleX; x < cssWidth; x += 100 * scaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssHeight);
      ctx.stroke();
    }
    for (let y = 100 * scaleY; y < cssHeight; y += 100 * scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssWidth, y);
      ctx.stroke();
    }

    // Fold line guideline (standard viewport fold at ~768px)
    if (bounds.height > DEFAULT_FOLD_Y) {
      const foldY = DEFAULT_FOLD_Y * scaleY;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(108, 110, 99, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, foldY);
      ctx.lineTo(cssWidth, foldY);
      ctx.stroke();

      ctx.font = '10px monospace';
      ctx.fillStyle = '#6c6e63';
      ctx.fillText(`Fold line (${DEFAULT_FOLD_Y}px)`, 12, foldY - 6);
      ctx.restore();
    }

    // 2. Render click points
    const dotRadius = 5;

    for (const point of points) {
      const x = point.x * scaleX;
      const y = point.y * scaleY;

      // Outer pointer circle
      ctx.beginPath();
      ctx.arc(x, y, dotRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(247, 165, 1, 0.25)';
      ctx.fill();

      // Inner solid circle
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#f7a501';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#23251d';
      ctx.stroke();
    }

    // 3. Hover Reticle / Pointer
    if (hover) {
      ctx.save();
      ctx.strokeStyle = 'rgba(35, 37, 29, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(hover.canvasX, 0);
      ctx.lineTo(hover.canvasX, cssHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hover.canvasY);
      ctx.lineTo(cssWidth, hover.canvasY);
      ctx.stroke();

      // Highlight circle only when hovering over an actual event
      if (hover.eventType && hover.snapPoint) {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(hover.snapPoint.x, hover.snapPoint.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#f7a501';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(247, 165, 1, 0.2)';
        ctx.fill();
      }

      ctx.restore();
    }
  }, [points, bounds, category, resizeTick, hover]);

  // Handle interactive mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const scaleX = (canvas.clientWidth || 800) / Math.max(bounds.width, 1);
    const scaleY = (canvas.clientHeight || 400) / Math.max(bounds.height, 1);

    const origX = Math.round(canvasX / Math.max(scaleX, 0.001));
    const origY = Math.round(canvasY / Math.max(scaleY, 0.001));

    // Match search radius in canvas pixels to visual blob/pointer radius
    const searchRadius = 16;
    let closestPoint: HeatmapPoint | null = null;
    let minDistanceSq = Infinity;
    let nearbyCount = 0;

    for (const p of points) {
      const ptCanvasX = p.x * scaleX;
      const ptCanvasY = p.y * scaleY;
      const dx = ptCanvasX - canvasX;
      const dy = ptCanvasY - canvasY;
      const distSq = dx * dx + dy * dy;
      if (distSq <= searchRadius * searchRadius) {
        nearbyCount++;
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestPoint = p;
        }
      }
    }

    const eventType = closestPoint ? (closestPoint.eventType || 'click') : null;
    const clientWidth = canvas.clientWidth || 800;
    const tooltipX = Math.min(Math.max(canvasX, 120), clientWidth - 120);
    const tooltipY = Math.max(canvasY - 10, 80);

    setHover({
      canvasX,
      canvasY,
      tooltipX,
      tooltipY,
      origX,
      origY,
      eventType,
      nearbyCount,
      timestamp: closestPoint?.timestamp,
      snapPoint: closestPoint ? { x: closestPoint.x * scaleX, y: closestPoint.y * scaleY } : null,
    });
  };

  const handleMouseLeave = () => {
    setHover(null);
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block w-full cursor-crosshair rounded-b-md"
        aria-label="Interactive click heatmap canvas"
      />

      {/* Floating Hover Tooltip showing event types */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full transform pb-3"
          style={{
            left: `${hover.tooltipX}px`,
            top: `${hover.tooltipY}px`,
          }}
        >
          <div className="rounded-md border border-hairline bg-surface-card px-3 py-2 text-xs text-ink shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-hairline-soft pb-1.5 mb-1.5">
              <span className="text-[11px] font-bold text-mute uppercase tracking-wider">Event:</span>
              {hover.eventType ? (
                <Badge tone="indigo">{hover.eventType}</Badge>
              ) : (
                <span className="text-[11px] text-mute font-medium">None</span>
              )}
            </div>
            <div className="font-mono text-[11px] text-body">
              Coordinates: ({hover.origX}, {hover.origY})
            </div>
            {hover.nearbyCount > 0 ? (
              <div className="mt-1 text-[11px] text-mute">
                {hover.nearbyCount} {hover.nearbyCount === 1 ? 'event' : 'events'} in this area
                {hover.timestamp && (
                  <span className="block text-[10px] text-mute/80 mt-0.5">
                    {formatDateTime(hover.timestamp)}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-mute/70">
                No events in this area
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
