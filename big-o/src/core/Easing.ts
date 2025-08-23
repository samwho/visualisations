/**
 * Creates a cubic bezier easing function that mimics CSS cubic-bezier()
 * @param x1 - X coordinate of first control point (0-1)
 * @param y1 - Y coordinate of first control point
 * @param x2 - X coordinate of second control point (0-1)
 * @param y2 - Y coordinate of second control point
 * @returns A function that takes a progress value (0-1) and returns the eased value
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): (t: number) => number {
  // Validate control points
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new Error("Control point X values must be in range [0, 1]");
  }

  // Pre-calculate coefficients for better performance
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  /**
   * Calculate x value for a given t
   */
  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  /**
   * Calculate y value for a given t
   */
  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }

  /**
   * Calculate derivative of x with respect to t
   */
  function sampleCurveDerivativeX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  /**
   * Use Newton-Raphson iteration to find t for a given x
   */
  function solveCurveX(x: number, epsilon: number = 1e-6): number {
    let t = x;

    // Newton's method - typically converges very quickly
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;
      if (Math.abs(currentX) < epsilon) {
        return t;
      }
      const derivative = sampleCurveDerivativeX(t);
      if (Math.abs(derivative) < 1e-6) {
        break;
      }
      t = t - currentX / derivative;
    }

    // Fall back to bisection if Newton's method fails
    let t0 = 0;
    let t1 = 1;
    t = x;

    while (t0 < t1) {
      const currentX = sampleCurveX(t);
      if (Math.abs(currentX - x) < epsilon) {
        return t;
      }
      if (x > currentX) {
        t0 = t;
      } else {
        t1 = t;
      }
      t = (t1 - t0) * 0.5 + t0;
    }

    return t;
  }

  // Return the easing function
  return function (progress: number): number {
    // Handle edge cases
    if (progress === 0) return 0;
    if (progress === 1) return 1;

    // Find t for the given x (progress)
    const t = solveCurveX(progress);

    // Return y value at t
    return sampleCurveY(t);
  };
}

export const ease = cubicBezier(0.25, 0.1, 0.25, 1);
export const easeIn = cubicBezier(0.42, 0, 1, 1);
export const easeOut = cubicBezier(0, 0, 0.58, 1);
export const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
export const linear = cubicBezier(0, 0, 1, 1);

export const easeInQuad = cubicBezier(0.55, 0.085, 0.68, 0.53);
export const easeInCubic = cubicBezier(0.55, 0.055, 0.675, 0.19);
export const easeOutCubic = cubicBezier(0.215, 0.61, 0.355, 1);
export const easeInOutCubic = cubicBezier(0.645, 0.045, 0.355, 1);
export const easeInQuart = cubicBezier(0.895, 0.03, 0.685, 0.22);
export const easeOutQuart = cubicBezier(0.165, 0.84, 0.44, 1);
export const easeInOutQuart = cubicBezier(0.77, 0, 0.175, 1);
