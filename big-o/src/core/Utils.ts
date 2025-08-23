export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function dedent(str: string) {
  const lines = str.split("\n");
  const minIndent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s+/)?.[0]?.length || 0)
  );
  return lines.map((line) => line.slice(minIndent)).join("\n");
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
export function cssVar(
  key: string,
  opts?: { cache?: boolean }
): string | undefined {
  const { cache = true } = opts || {};
  if (cache && CSS_VAR_CACHE.has(key)) {
    return CSS_VAR_CACHE.get(key)!;
  }

  const style = window.getComputedStyle(document.body);
  const value = style.getPropertyValue(key) || FALLBACK_VALUES[key];
  if (cache && value) {
    CSS_VAR_CACHE.set(key, value);
  }
  return value;
}

let transition: ViewTransition | undefined;
export async function startViewTransition(f: () => void) {
  if (document.startViewTransition) {
    if (transition) {
      await transition.updateCallbackDone;
      transition.skipTransition();
      await transition.finished;
      transition = undefined;
    }
    transition = document.startViewTransition(() => {
      try {
        f();
      } catch (error) {
        console.error("Error during view transition:", error);
      }
    });
  } else {
    f();
  }
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function hash(alg: AlgorithmIdentifier, data: string): Promise<string> {
  const sourceBytes = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest(alg, sourceBytes);
  const resultBytes = [...new Uint8Array(digest)];
  return resultBytes.map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function sha256(source: string) {
  return hash("SHA-256", source);
}

export async function cssSafeName(name: string): Promise<string> {
  const hash = await sha256(name);
  return `safe-${hash.substring(0, 8)}`;
}
