export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const mediaQueries = Object.fromEntries(
  Object.entries(breakpoints).map(([name, width]) => [
    name,
    `(min-width: ${width}px)`,
  ]),
) as Record<Breakpoint, string>;

