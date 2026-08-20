"use client";

import { useEffect, useState } from "react";

import { mediaQueries, type Breakpoint } from "@/lib/responsive";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useBreakpoint(breakpoint: Breakpoint) {
  return useMediaQuery(mediaQueries[breakpoint]);
}

