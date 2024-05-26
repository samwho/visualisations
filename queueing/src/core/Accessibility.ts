import { PixiPlugin } from "gsap/all";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;
}

export function prefersDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function prefersReducedTransparency(): boolean {
  return window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
}

export function filterPixiTween(tween: PixiPlugin.Vars): PixiPlugin.Vars {
  if (prefersReducedMotion()) {
    delete tween.scale;
  }
  return tween;
}

export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
}
