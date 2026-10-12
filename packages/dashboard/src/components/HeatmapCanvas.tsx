import { useEffect, useRef, useState } from 'react';
import type { HeatmapPoint } from '../types';

export type HeatmapMode = 'dots' | 'grid';

const GRID_COLUMNS = 32;

/** HSL ramp from cool (low density) to hot (high density). */
function heatColor(t: number, alphaScale = 1): string {
  const clamped = Math.min(1, Math.max(0, t));
  const hue = 220 - 220 * clamped; // 220 (blue) → 0 (red)
  const alpha = (0.2 + 0.65 * clamped) * alphaScale;
  return `hsla(${hue}, 90%, 55%, ${alpha})`;
}

export function HeatmapCanvas({
  points,
  bounds,
  mode,
}: {
  points: HeatmapPoint[];
  bounds: { width: number; height: number };
  mode: HeatmapMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resizeTick, setResizeTick] = useState(0);

  // Redraw when the element resizes (e.g. window resize, responsive layout).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setResizeTick((tick) => tick + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cssWidth = canvas.clientWidth || 800;
    const aspect = bounds.height / Math.max(bounds.width, 1);
    const cssHeight = Math.max(220, Math.round(cssWidth * aspect));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Background grid, aligned to "real" viewport pixels (every 200px).
    const scaleX = cssWidth / Math.max(bounds.width, 1);
    const scaleY = cssHeight / Math.max(bounds.height, 1);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 200 * scaleX; x < cssWidth; x += 200 * scaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssHeight);
      ctx.stroke();
    }
    for (let y = 200 * scaleY; y < cssHeight; y += 200 * scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssWidth, y);
      ctx.stroke();
    }

    if (mode === 'dots') {
      ctx.globalCompositeOperation = 'lighter';
      const radius = 16;
      for (const point of points) {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
        gradient.addColorStop(0.45, 'rgba(99, 102, 241, 0.28)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    // Density grid mode.
    const rows = Math.max(1, Math.round(GRID_COLUMNS * (bounds.height / Math.max(bounds.width, 1))));
    const cells = new Array<number>(GRID_COLUMNS * rows).fill(0);
    let max = 0;

    for (const point of points) {
      const col = Math.min(GRID_COLUMNS - 1, Math.max(0, Math.floor((point.x / bounds.width) * GRID_COLUMNS)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor((point.y / bounds.height) * rows)));
      const index = row * GRID_COLUMNS + col;
      cells[index] += 1;
      if (cells[index] > max) max = cells[index];
    }

    const cellWidth = cssWidth / GRID_COLUMNS;
    const cellHeight = cssHeight / rows;

    for (let index = 0; index < cells.length; index += 1) {
      const count = cells[index];
      if (count === 0) continue;
      const col = index % GRID_COLUMNS;
      const row = Math.floor(index / GRID_COLUMNS);
      ctx.fillStyle = heatColor(max > 0 ? count / max : 0);
      ctx.fillRect(col * cellWidth, row * cellHeight, Math.ceil(cellWidth) + 1, Math.ceil(cellHeight) + 1);
    }
  }, [points, bounds, mode, resizeTick]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-slate-800 bg-slate-950"
      aria-label="Click heatmap canvas"
    />
  );
}
