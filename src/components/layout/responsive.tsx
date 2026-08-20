import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import type { Breakpoint } from "@/lib/responsive";

type ResponsiveProps = ComponentProps<"div"> & {
  from?: Breakpoint;
  below?: Breakpoint;
};

const showFrom: Record<Breakpoint, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
  xl: "hidden xl:block",
  "2xl": "hidden 2xl:block",
};

const hideFrom: Record<Breakpoint, string> = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
  "2xl": "2xl:hidden",
};

export function Responsive({
  from,
  below,
  className,
  ...props
}: ResponsiveProps) {
  return (
    <div
      className={cn(from && showFrom[from], below && hideFrom[below], className)}
      {...props}
    />
  );
}

