export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export function rad2deg(rad: number) {
  return rad * (180 / Math.PI);
}

export function setDynamicInterval(
  callback: () => void,
  getInterval: () => number
): () => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  const run = () => {
    callback();
    const nextInterval = getInterval();
    timeoutId = setTimeout(run, nextInterval);
  };

  timeoutId = setTimeout(run, getInterval());

  return () => clearTimeout(timeoutId); // Return a function to clear the interval
}

const CSS_VAR_CACHE: Map<string, string> = new Map();
// Not sure why but sometimes we aren't able to read the CSS variables, only
// seen it happen on iOS Safari. Putting in fallbacks as a hack.
const FALLBACK_VALUES: Record<string, string> = {
  "--palette-orange": "#e69f00",
  "--palette-blue": "#56b4e9",
  "--palette-green": "#009e73",
  "--palette-yellow": "#f0e442",
  "--palette-dark-blue": "#0072b2",
  "--palette-red": "#d55e00",
  "--palette-pink": "#cc79a7",
  "--palette-grey": "#2e3440",
};
export function cssVar(key: string, opts?: { cache?: boolean }): string {
  const { cache = true } = opts || {};
  if (cache && CSS_VAR_CACHE.has(key)) {
    return CSS_VAR_CACHE.get(key)!;
  }

  const style = window.getComputedStyle(document.body);
  const value = style.getPropertyValue(key) || FALLBACK_VALUES[key];
  if (cache) {
    CSS_VAR_CACHE.set(key, value);
  }
  return value;
}

// function to add st or rd or nd to a number
export function numWithSuffix(num: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = num % 100;
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
