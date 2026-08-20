"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const menuItems = ["품목관리", "오차범위관리", "코드관리"] as const;

export function ReferenceInformationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="h-11 gap-1 px-3 sm:px-5"
        onClick={() => setIsOpen((open) => !open)}
        size="default"
        type="button"
        variant="ghost"
      >
        기준정보
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen ? (
        <div
          aria-label="기준정보 하위 메뉴"
          className="absolute top-full right-0 z-50 mt-2 w-48 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          id={menuId}
          role="menu"
        >
          {menuItems.map((item) => (
            <div
              aria-disabled="true"
              className="flex min-h-11 cursor-not-allowed items-center rounded-xl px-3 text-sm font-medium text-muted-foreground opacity-50"
              key={item}
              role="menuitem"
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
