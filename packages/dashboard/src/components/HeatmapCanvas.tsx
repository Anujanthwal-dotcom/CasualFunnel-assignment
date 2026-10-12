import { useEffect, useRef, useState, useMemo } from 'react';
import type { HeatmapPoint } from '../types';
import { Badge } from './ui';
import { formatDateTime } from '../lib/format';

export type HeatmapCategory = 'click' | 'heatmap' | 'grid';

export interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  bounds: { width: number; height: number };
  category?: HeatmapCategory;
}

interface CoordinateCluster {
  x: number;
  y: number;
  count: number;
  eventType?: string;
  timestamp?: string;
}

interface HoverState {
  tooltipX: number;
  tooltipY: number;
  placementX: 'left' | 'center' | 'right';
  placementY: 'above' | 'below';
  canvasX: number;
  canvasY: number;
  origX: number;
  origY: number;
  eventType: string | null;
  count: number;
  color: string;
  timestamp?: string;
  snapPoint?: { x: number; y: number } | null;
}

interface GradientStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

// 5-stop color gradient from lowest intensity to highest intensity:
// Cool Blue -> Cyan/Teal -> Green -> Amber/Gold -> Hot Red
const INTENSITY_GRADIENT: GradientStop[] = [
  { pos: 0.0, r: 44, g: 132, b: 224 },   // #2c84e0 (1 event / lowest intensity)
  { pos: 0.25, r: 16, g: 155, b: 165 },  // Teal
  { pos: 0.5, r: 44, g: 140, b: 102 },   // #2c8c66 (Green)
  { pos: 0.75, r: 247, g: 165, b: 1 },   // #f7a501 (Amber / Gold)
  { pos: 1.0, r: 205, g: 66, b: 57 },    // #cd4239 (Hot Red / peak intensity)
];

/** Return solid color string interpolated along the intensity gradient */
function getIntensityColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  for (let i = 0; i < INTENSITY_GRADIENT.length - 1; i++) {
    const s1 = INTENSITY_GRADIENT[i];
    const s2 = INTENSITY_GRADIENT[i + 1];
    if (t >= s1.pos && t <= s2.pos) {
      const p = (t - s1.pos) / (s2.pos - s1.pos);
      const r = Math.round(s1.r + (s2.r - s1.r) * p);
      const g = Math.round(s1.g + (s2.g - s1.g) * p);
      const b = Math.round(s1.b + (s2.b - s1.b) * p);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = INTENSITY_GRADIENT[INTENSITY_GRADIENT.length - 1];
  return `rgb(${last.r}, ${last.g}, ${last.b})`;
}

/** Groups events by coordinate to determine exact intensity per location */
function groupEventsByCoordinate(
  points: HeatmapPoint[],
  snapPx = 4
): CoordinateCluster[] {
  if (points.length === 0) return [];

  const map = new Map<
    string,
    {
      sumX: number;
      sumY: number;
      count: number;
      eventType?: string;
      timestamp?: string;
    }
  >();

  for (const pt of points) {
    const gx = Math.round(pt.x / snapPx);
    const gy = Math.round(pt.y / snapPx);
    const key = `${gx}_${gy}`;
    const entry = map.get(key);
    if (entry) {
      entry.sumX += pt.x;
      entry.sumY += pt.y;
      entry.count++;
      if (pt.timestamp && (!entry.timestamp || pt.timestamp > entry.timestamp)) {
        entry.timestamp = pt.timestamp;
        entry.eventType = pt.eventType;
      }
    } else {
      map.set(key, {
        sumX: pt.x,
        sumY: pt.y,
        count: 1,
        eventType: pt.eventType || 'click',
        timestamp: pt.timestamp,
      });
    }
  }

  const clusters: CoordinateCluster[] = [];
  for (const item of map.values()) {
    clusters.push({
      x: Math.round(item.sumX / item.count),
      y: Math.round(item.sumY / item.count),
      count: item.count,
      eventType: item.eventType,
      timestamp: item.timestamp,
    });
  }

  return clusters;
}

const DEFAULT_FOLD_Y = 768;

export function HeatmapCanvas({
  points,
  bounds,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Group events by coordinate
  const clusters = useMemo(() => groupEventsByCoordinate(points, 4), [points]);
  const maxCount = useMemo(
    () => clusters.reduce((max, c) => Math.max(max, c.count), 1),
    [clusters]
  );

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

    // 2. Render Solid Circles with Color Gradient by Event Intensity
    if (clusters.length > 0) {
      // Sort ascending by count so hot/high-intensity circles render on top
      const sorted = [...clusters].sort((a, b) => a.count - b.count);

      for (const cluster of sorted) {
        const x = cluster.x * scaleX;
        const y = cluster.y * scaleY;

        // Ratio from 0.0 (1 event) to 1.0 (max events)
        const ratio = maxCount > 1 ? (cluster.count - 1) / (maxCount - 1) : 0;
        const solidColor = getIntensityColor(ratio);

        // Solid circle radius slightly scaled by count (5px to 8.5px)
        const radius = Math.min(8.5, Math.max(5, 5 + Math.round(ratio * 3.5)));

        // Solid circle fill (no radial blur)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = solidColor;
        ctx.fill();

        // Crisp white inner stroke
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Subtle dark outer border for contrast on light backgrounds
        ctx.beginPath();
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(35, 37, 29, 0.35)';
        ctx.stroke();
      }
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
      if (hover.snapPoint && hover.count > 0) {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(hover.snapPoint.x, hover.snapPoint.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = hover.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [clusters, bounds, maxCount, resizeTick, hover]);

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

    const searchRadius = 16;
    let closestCluster: CoordinateCluster | null = null;
    let minDistanceSq = Infinity;

    for (const c of clusters) {
      const cCanvasX = c.x * scaleX;
      const cCanvasY = c.y * scaleY;
      const dx = cCanvasX - canvasX;
      const dy = cCanvasY - canvasY;
      const distSq = dx * dx + dy * dy;
      if (distSq <= searchRadius * searchRadius && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestCluster = c;
      }
    }

    const clientWidth = canvas.clientWidth || 800;
    const targetX = closestCluster ? closestCluster.x * scaleX : canvasX;
    const targetY = closestCluster ? closestCluster.y * scaleY : canvasY;

    // Smart horizontal placement preventing overflow on canvas sides
    let placementX: 'left' | 'center' | 'right' = 'center';
    let tooltipX = targetX;

    if (targetX < 140) {
      // Near left boundary: align card to the right of point
      placementX = 'right';
      tooltipX = Math.max(12, targetX + 14);
    } else if (targetX > clientWidth - 140) {
      // Near right boundary: align card to the left of point
      placementX = 'left';
      tooltipX = Math.min(clientWidth - 12, targetX - 14);
    } else {
      // Centered over point
      placementX = 'center';
      tooltipX = targetX;
    }

    // Smart vertical placement flipping when near top
    let placementY: 'above' | 'below' = 'above';
    let tooltipY = targetY - 12;

    if (targetY < 100) {
      // Near top edge: flip card below point
      placementY = 'below';
      tooltipY = targetY + 16;
    } else {
      // Above point
      placementY = 'above';
      tooltipY = targetY - 12;
    }

    const ratio = closestCluster && maxCount > 1
      ? (closestCluster.count - 1) / (maxCount - 1)
      : 0;
    const color = getIntensityColor(ratio);

    setHover({
      canvasX,
      canvasY,
      tooltipX,
      tooltipY,
      placementX,
      placementY,
      origX: closestCluster ? closestCluster.x : origX,
      origY: closestCluster ? closestCluster.y : origY,
      eventType: closestCluster?.eventType || null,
      count: closestCluster ? closestCluster.count : 0,
      color,
      timestamp: closestCluster?.timestamp,
      snapPoint: closestCluster
        ? { x: closestCluster.x * scaleX, y: closestCluster.y * scaleY }
        : null,
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

      {/* Floating Hover Tooltip showing event count and intensity at coordinate */}
      {hover && (
        <div
          className={`pointer-events-none absolute z-30 transform ${
            hover.placementX === 'center'
              ? '-translate-x-1/2'
              : hover.placementX === 'left'
              ? '-translate-x-full'
              : 'translate-x-0'
          } ${hover.placementY === 'above' ? '-translate-y-full' : 'translate-y-0'}`}
          style={{
            left: `${hover.tooltipX}px`,
            top: `${hover.tooltipY}px`,
          }}
        >
          <div className="w-64 max-w-[calc(100vw-3rem)] rounded-md border border-hairline bg-surface-card p-3 text-xs text-ink shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-hairline-soft pb-1.5 mb-1.5">
              <span className="text-[11px] font-bold text-mute uppercase tracking-wider">Event:</span>
              {hover.eventType ? (
                <Badge tone="indigo">{hover.eventType}</Badge>
              ) : (
                <span className="text-[11px] text-mute font-medium">None</span>
              )}
            </div>
            <div className="font-mono text-[11px] text-body">
              Coordinate: ({hover.origX}, {hover.origY})
            </div>
            {hover.count > 0 ? (
              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-ink">
                <span
                  className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full border border-[#23251d] shrink-0"
                  style={{ backgroundColor: hover.color }}
                />
                <div>
                  <span>
                    {hover.count} {hover.count === 1 ? 'event' : 'events'} at this coordinate
                  </span>
                  {hover.timestamp && (
                    <span className="block text-[10px] text-mute font-normal mt-0.5">
                      {formatDateTime(hover.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-mute/70">
                No events at this coordinate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
