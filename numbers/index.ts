/// <reference types="bun-types" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { nextColor } from "./src/Colors";
import { statsForYear } from "./src/ColinMaths";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(ScrollToPlugin);
gsap.registerPlugin(TextPlugin);

let currentScale = 1;

function init(nsPerPixel: number) {
  currentScale = nsPerPixel;
  const visual = document.getElementById("visual")!;
  const totalHeight = visual.getBoundingClientRect().height;

  setData();

  each((container, latency, i) => {
    const ns = parseFloat(latency.getAttribute("data-ns")!);
    const height = Math.min(totalHeight, ns / nsPerPixel);
    latency.style.backgroundColor = nextColor().toHex();
    latency.style.height = `${
      (Math.min(totalHeight, height) / totalHeight) * 100
    }%`;
  });

  const guide = document.getElementById("guide")!;

  let step = 0;
  let last: gsap.core.Tween;
  const steps = [
    "Tap a bar to begin.",
    "Each bar represents how long it takes to perform a certain operation.",
    "The heights of the bars are proportional to the time that operation takes.",
    "Every bar is scaled relative to each other.",
    "Tapping on a bar scales it to the height you tapped.",
    "Tapping above a bar makes it larger.",
    "Tapping below a bar makes it smaller.",
    "Tapping on bars to the right of the screen moves the view to the right.",
    "Tapping on bars to the left of the screen moves the view to the left.",
    "Have fun ❤",
  ];

  const f = () => {
    if (step === steps.length) {
      last.progress(1);
      guide.remove();
      window.removeEventListener("pointerup", f);
      return;
    }

    last?.progress(1);
    guide.innerText = "";
    last = gsap.to(guide, {
      text: steps[step],
      duration: 1,
      ease: "power4.out",
    });
    step++;
  };
  window.addEventListener("pointerup", f);
  f();
}

function nsToHuman(ns: number) {
  if (ns < 1000) {
    return `${ns.toFixed(0)}ns`;
  } else if (ns < 1000000) {
    return `${(ns / 1000).toFixed(0)}us`;
  } else if (ns < 1000000000) {
    return `${(ns / 1000000).toFixed(0)}ms`;
  } else {
    return `${(ns / 1000000000).toFixed(0)}s`;
  }
}

function reorder() {
  const visual = document.getElementById("visual")!;
  const containers =
    visual.querySelectorAll<HTMLDivElement>(".latency-container");

  const sorted = Array.from(containers).sort((a, b) => {
    const aLatency = a.querySelector<HTMLDivElement>(".latency")!;
    const bLatency = b.querySelector<HTMLDivElement>(".latency")!;
    return (
      parseFloat(aLatency.getAttribute("data-ns")!) -
      parseFloat(bLatency.getAttribute("data-ns")!)
    );
  });

  for (const [i, container] of sorted.entries()) {
    container.style.order = i.toString();
  }
}

async function setData() {
  const year = getYear();
  const data = statsForYear(year);

  for (const [key, value] of Object.entries(data)) {
    const container = document.getElementById(key)!;
    const latency = container.querySelector<HTMLDivElement>(".latency")!;
    const label = container.querySelector<HTMLDivElement>(".latency-label")!;

    latency.setAttribute("data-ns", value.toString());
    label.innerText = nsToHuman(value);
  }
  await setScale(currentScale);
  reorder();
}

function getYear() {
  const year = document.getElementById("year-value")!;
  return parseInt(year.innerText);
}

function each(f: (container: HTMLElement, el: HTMLElement, i: number) => void) {
  const visual = document.getElementById("visual")!;
  const containers =
    visual.querySelectorAll<HTMLDivElement>(".latency-container");
  for (const [i, container] of containers.entries()) {
    const latency = container.querySelector<HTMLDivElement>(".latency")!;
    f(container, latency, i);
  }
}

function setScale(nsPerPixel: number) {
  return new Promise((resolve) => {
    currentScale = nsPerPixel;
    const visual = document.getElementById("visual")!;
    const totalHeight = visual.getBoundingClientRect().height;

    const timeline = gsap.timeline({
      paused: true,
      onComplete: resolve,
    });

    each((container, latency, i) => {
      gsap.killTweensOf(latency);

      const ns = parseFloat(latency.getAttribute("data-ns")!);
      const height = ns / nsPerPixel;

      timeline.to(
        latency,
        {
          height: `${(Math.min(totalHeight, height) / totalHeight) * 100}%`,
          duration: 0.5,
          ease: "power4.out",
        },
        "<"
      );
    });

    timeline.play();
  });
}

function adjustWidth(amount: number) {
  const timeline = gsap.timeline({
    paused: true,
  });

  each((container, latency, i) => {
    const currentWidth = container.getBoundingClientRect().width;
    timeline.to(
      container,
      {
        width: currentWidth + amount,
        minWidth: currentWidth + amount,
        duration: 0.5,
        ease: "power4.out",
      },
      "<"
    );
  });

  timeline.play();
}

async function main() {
  init(0.005);

  const visual = document.getElementById("visual")!;

  const containers =
    visual.querySelectorAll<HTMLDivElement>(".latency-container");
  for (const container of containers) {
    container.addEventListener("pointerup", (e) => {
      if (e.button !== 0) {
        return;
      }
      const height = visual.getBoundingClientRect().height;
      const clickYPercent = e.clientY / height;
      const latency = container.querySelector<HTMLDivElement>(".latency")!;
      const ns = parseFloat(latency.getAttribute("data-ns")!);
      const nsPerPixel = ns / height / (1 - clickYPercent);
      setScale(nsPerPixel);

      const box = container.getBoundingClientRect();
      gsap.to(visual, {
        scrollTo: {
          x: container.offsetLeft,
          offsetX: window.visualViewport!.width! / 2 - box.width / 2,
        },
        duration: 1,
        ease: "power2.out",
      });
    });
  }

  const zoomIn = document.querySelector<HTMLButtonElement>("#zoom .plus");
  zoomIn?.addEventListener("click", () => {
    adjustWidth(10);
  });

  const zoomOut = document.querySelector<HTMLButtonElement>("#zoom .minus");
  zoomOut?.addEventListener("click", () => {
    adjustWidth(-10);
  });

  const nextYear = document.querySelector<HTMLButtonElement>("#year .plus");
  nextYear?.addEventListener("click", async () => {
    const year = getYear();
    if (year === 2030) {
      return;
    }

    const next = year + 1;
    document.getElementById("year-value")!.innerText = next.toString();
    await setData();
  });

  const prevYear = document.querySelector<HTMLButtonElement>("#year .minus");
  prevYear?.addEventListener("click", async () => {
    const year = getYear();
    if (year === 1980) {
      return;
    }

    const next = year - 1;
    document.getElementById("year-value")!.innerText = next.toString();
    await setData();
  });
}

document.addEventListener("DOMContentLoaded", main);
