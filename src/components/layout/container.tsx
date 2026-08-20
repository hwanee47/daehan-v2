import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg" | "xl" | "full";
};

const sizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function Container({
  size = "xl",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizes[size], className)}
      {...props}
    />
  );
}

