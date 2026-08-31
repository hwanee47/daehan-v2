"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type InspectionMarker = {
  x: number;
  y: number;
  label: number;
};

type ImageBox = { height: number; left: number; top: number; width: number };

export function InspectionMarkerImage({
  alt,
  className,
  editable = false,
  markerSize = "responsive",
  markers,
  onPlace,
  url,
  verticalAlign = "center",
}: {
  alt: string;
  className?: string;
  editable?: boolean;
  markerSize?: "fixed" | "responsive";
  markers: InspectionMarker[];
  onPlace?: (x: number, y: number) => void;
  priority?: boolean;
  url: string;
  verticalAlign?: "center" | "top";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ height: 0, width: 0 });
  const [box, setBox] = useState<ImageBox>({ height: 0, left: 0, top: 0, width: 0 });

  useEffect(() => {
    let active = true;
    const source = new window.Image();
    source.onload = () => {
      if (active) setNaturalSize({ width: source.naturalWidth, height: source.naturalHeight });
    };
    source.src = url;
    return () => { active = false; };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !naturalSize.width || !naturalSize.height) return;
    const update = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const scale = Math.min(width / naturalSize.width, height / naturalSize.height);
      const imageWidth = naturalSize.width * scale;
      const imageHeight = naturalSize.height * scale;
      setBox({ width: imageWidth, height: imageHeight, left: (width - imageWidth) / 2, top: verticalAlign === "top" ? 0 : (height - imageHeight) / 2 });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [naturalSize, verticalAlign]);

  function place(event: React.PointerEvent<HTMLDivElement>) {
    if (!editable || !onPlace || !box.width || !box.height) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - box.left) / box.width;
    const y = (event.clientY - bounds.top - box.top) / box.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onPlace(Number(x.toFixed(6)), Number(y.toFixed(6)));
  }

  const displayScale = naturalSize.width && box.width ? box.width / naturalSize.width : 1;
  const displayBaseSize = Math.min(box.width, box.height);
  const usesFixedMarkerSize = editable || markerSize === "fixed";
  const markerDisplayRadius = usesFixedMarkerSize ? 16 : Math.min(26, Math.max(7, displayBaseSize * 0.03));
  const markerDisplayFontSize = usesFixedMarkerSize ? 14 : Math.min(22, Math.max(7, displayBaseSize * 0.026));
  const markerRadius = markerDisplayRadius / displayScale;
  const markerFontSize = markerDisplayFontSize / displayScale;
  const markerStrokeWidth = (usesFixedMarkerSize ? 1.5 : Math.max(1, markerDisplayRadius * 0.1)) / displayScale;

  return (
    <div
      aria-label={editable ? "이미지를 클릭해 선택한 검사항목 순번을 배치하세요" : undefined}
      className={cn("relative size-full overflow-hidden", editable && "cursor-crosshair touch-none", className)}
      onPointerDown={place}
      ref={containerRef}
      role={editable ? "application" : undefined}
    >
      {naturalSize.width > 0 && naturalSize.height > 0 ? <svg aria-label={alt} className="pointer-events-none absolute inset-0 size-full overflow-hidden text-neutral-700" preserveAspectRatio={verticalAlign === "top" ? "xMidYMin meet" : "xMidYMid meet"} role="img" viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}>
        <title>{alt}</title>
        <image height={naturalSize.height} href={url} preserveAspectRatio="none" width={naturalSize.width} x="0" y="0" />
        {markers.map((marker) => {
          const x = marker.x * naturalSize.width;
          const y = marker.y * naturalSize.height;
          return <g aria-label={`${marker.label}번 검사 위치`} key={marker.label} role="img"><title>{marker.label}번 검사 위치</title><circle cx={x} cy={y} fill="none" r={markerRadius} stroke="currentColor" strokeWidth={markerStrokeWidth} /><text dominantBaseline="central" fill="currentColor" fontSize={markerFontSize} fontWeight="700" textAnchor="middle" x={x} y={y}>{marker.label}</text></g>;
        })}
      </svg> : null}
    </div>
  );
}
