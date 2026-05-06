"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOGICAL_SIZE, buildScene } from "@/lib/geometry";
import { mulberry32 } from "@/lib/random";
import { renderScene } from "@/lib/render";
import { cn } from "@/lib/utils";

const STIPPLE_RNG_SALT = 0x52eb_b287;
const MIN_LINES = 1;
const MAX_LINES = 50;
const MIN_RADIUS = 0.75;
const MAX_RADIUS = 6;

export function StippleTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lineCount, setLineCount] = useState(8);
  const [dotRadius, setDotRadius] = useState(2);
  const [dotColor, setDotColor] = useState("#1a1a1a");
  const [showLines, setShowLines] = useState(true);

  const scene = useMemo(() => buildScene(seed, lineCount), [seed, lineCount]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const pixelSize = Math.round(LOGICAL_SIZE * dpr);
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderScene(ctx, pixelSize, {
      scene,
      dotRadiusLogical: dotRadius,
      dotColor,
      showLines,
    }, mulberry32((seed ^ STIPPLE_RNG_SALT) >>> 0));
  }, [scene, dotRadius, dotColor, showLines, seed]);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [paint]);

  const downloadPng = useCallback(() => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = LOGICAL_SIZE;
    exportCanvas.height = LOGICAL_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderScene(ctx, LOGICAL_SIZE, {
      scene,
      dotRadiusLogical: dotRadius,
      dotColor,
      showLines,
    }, mulberry32((seed ^ STIPPLE_RNG_SALT) >>> 0));
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "random-misdirections.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [scene, dotRadius, dotColor, showLines, seed]);

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 2 ** 31));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:justify-center md:gap-14">
      <div className="flex shrink-0 justify-center md:sticky md:top-12">
        <div
          className={cn(
            "rounded-xl bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]",
            "dark:bg-neutral-950 dark:ring-white/[0.08]",
          )}
        >
          <canvas
            ref={canvasRef}
            className="aspect-square w-full max-w-[500px] rounded-md"
            aria-label="Stippled polygon preview"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-9 md:max-w-sm">
        <header className="space-y-2">
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
            Random Misdirections
          </h1>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Lines split the square; each cell gets a random gradient direction, then stippled dots (denser
            where the gradient is darker).
          </p>
        </header>

        <div className="flex flex-col gap-7">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
              Lines ({lineCount})
            </span>
            <input
              type="range"
              min={MIN_LINES}
              max={MAX_LINES}
              value={lineCount}
              onChange={(e) => setLineCount(Number(e.target.value))}
              className={cn(
                "h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-800",
                "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:bg-neutral-100",
                "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-900 dark:[&::-moz-range-thumb]:bg-neutral-100",
              )}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Dot radius ({dotRadius.toFixed(2)} px)
            </span>
            <input
              type="range"
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={0.05}
              value={dotRadius}
              onChange={(e) => setDotRadius(Number(e.target.value))}
              className={cn(
                "h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 dark:bg-neutral-800",
                "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:bg-neutral-100",
                "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-900 dark:[&::-moz-range-thumb]:bg-neutral-100",
              )}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Dot color
            </span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={dotColor}
                onChange={(e) => setDotColor(e.target.value)}
                className="h-11 w-14 cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-transparent p-0 shadow-sm dark:border-neutral-700"
                aria-label="Pick stipple color"
              />
              <input
                type="text"
                value={dotColor}
                onChange={(e) => setDotColor(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 shadow-sm outline-none ring-neutral-900/10 focus:border-neutral-400 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-500"
                spellCheck={false}
              />
            </div>
          </label>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200/80 bg-white/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Show dividing lines
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Overlay the black splits used to build regions.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showLines}
              onClick={() => setShowLines((v) => !v)}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-600 dark:focus-visible:ring-offset-neutral-950",
                showLines ? "bg-neutral-900 dark:bg-neutral-200" : "bg-neutral-300 dark:bg-neutral-700",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform dark:bg-neutral-950",
                  showLines ? "translate-x-6" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={regenerate}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-950"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={downloadPng}
            className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:focus-visible:ring-neutral-600 dark:focus-visible:ring-offset-neutral-950"
          >
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
