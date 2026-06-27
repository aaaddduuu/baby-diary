import { useEffect } from "react";

interface LockedElementState {
  element: HTMLElement;
  overflow: string;
  overscrollBehavior: string;
}

let activeLocks = 0;
let lockedElements: LockedElementState[] = [];

function lockAppScroll() {
  const scrollContainers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-app-scroll-container]"),
  );
  const elements = [document.documentElement, document.body, ...scrollContainers];

  lockedElements = elements.map((element) => ({
    element,
    overflow: element.style.overflow,
    overscrollBehavior: element.style.overscrollBehavior,
  }));

  for (const { element } of lockedElements) {
    element.style.overflow = "hidden";
    element.style.overscrollBehavior = "none";
  }
}

function unlockAppScroll() {
  for (const { element, overflow, overscrollBehavior } of lockedElements) {
    element.style.overflow = overflow;
    element.style.overscrollBehavior = overscrollBehavior;
  }
  lockedElements = [];
}

export default function useAppScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    activeLocks += 1;
    if (activeLocks === 1) lockAppScroll();

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) unlockAppScroll();
    };
  }, [active]);
}
