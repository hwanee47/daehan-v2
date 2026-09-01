"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
  printMarkerSize = "responsive",
  url,
  verticalAlign = "center",
}: {
  alt: string;
  className?: string;
  editable?: boolean;
  markerSize?: "fixed" | "responsive";
  markers: InspectionMarker[];
  onPlace?: (x: number, y: number) => void;
  printMarkerSize?: "fixed" | "responsive";
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
    const updateForPrint = () => flushSync(update);
    window.addEventListener("beforeprint", updateForPrint);
    window.addEventListener("afterprint", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", updateForPrint);
      window.removeEventListener("afterprint", update);
    };
  }, [naturalSize, verticalAlign]);

  function place(event: React.PointerEvent<HTMLDivElement>) {
    if (!editable || !onPlace || !box.width || !box.height) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - box.left) / box.width;
    const y = (event.clientY - bounds.top - box.top) / box.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onPlace(Number(x.toFixed(6)), Number(y.toFixed(6)));
  }

  const displayBaseSize = Math.min(box.width, box.height);
  const usesFixedMarkerSize = editable || markerSize === "fixed";
  const markerDisplayRadius = usesFixedMarkerSize ? 16 : Math.min(26, Math.max(7, displayBaseSize * 0.03));
  const markerDisplayFontSize = usesFixedMarkerSize ? 14 : Math.min(22, Math.max(7, displayBaseSize * 0.026));
  const markerDiameter = markerDisplayRadius * 2;
  const markerStrokeWidth = usesFixedMarkerSize ? 1.5 : Math.max(1, markerDisplayRadius * 0.1);

  return (
    <div
      aria-label={editable ? "이미지를 클릭해 선택한 검사항목 순번을 배치하세요" : undefined}
      className={cn("relative size-full overflow-hidden", editable && "cursor-crosshair touch-none", printMarkerSize === "fixed" && "inspection-marker-has-print-overlay", className)}
      onPointerDown={place}
      ref={containerRef}
      role={editable ? "application" : undefined}
    >
      <Image
        alt={alt}
        className={cn("pointer-events-none object-contain", verticalAlign === "top" ? "object-top" : "object-center")}
        fill
        sizes="100vw"
        src={url}
        unoptimized
      />
      {naturalSize.width > 0 && naturalSize.height > 0 ? <div className="pointer-events-none absolute" style={{ height: box.height, left: box.left, top: box.top, width: box.width }}>
        <div aria-label={`${alt} 검사 위치`} className="inspection-marker-screen-overlay absolute inset-0" role="img">
          {markers.map((marker) => <span
            aria-label={`${marker.label}번 검사 위치`}
            className="inspection-marker absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-current font-bold leading-none text-neutral-700"
            key={marker.label}
            role="img"
            style={{ borderWidth: markerStrokeWidth, fontSize: markerDisplayFontSize, height: markerDiameter, left: `${marker.x * 100}%`, top: `${marker.y * 100}%`, width: markerDiameter }}
          >{marker.label}</span>)}
        </div>
      </div> : null}
      {naturalSize.width > 0 && naturalSize.height > 0 && printMarkerSize === "fixed" ? <svg
        aria-label={`${alt} 인쇄용 검사 위치`}
        className="inspection-marker-print-overlay pointer-events-none absolute inset-0 size-full overflow-visible text-neutral-700"
        preserveAspectRatio={verticalAlign === "top" ? "xMidYMin meet" : "xMidYMid meet"}
        role="img"
        viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
      >
        {markers.map((marker) => {
          const baseSize = Math.min(naturalSize.width, naturalSize.height);
          return <g aria-label={`${marker.label}번 검사 위치`} key={marker.label} role="img">
            <title>{marker.label}번 검사 위치</title>
            <circle cx={marker.x * naturalSize.width} cy={marker.y * naturalSize.height} fill="rgb(255 255 255 / 72%)" r={baseSize * 0.035} stroke="currentColor" strokeWidth={baseSize * 0.0045} />
            <text dominantBaseline="central" fill="currentColor" fontSize={baseSize * 0.05} fontWeight="700" textAnchor="middle" x={marker.x * naturalSize.width} y={marker.y * naturalSize.height}>{marker.label}</text>
          </g>;
        })}
      </svg> : null}
    </div>
  );
}
