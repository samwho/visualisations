export function spring(
  tension: number,
  friction: number,
  initialVelocity: number,
): (x: number) => number {
  return (x: number) => {
    const scaledTension = tension * 0.0001;
    const scaledFriction = friction * 0.0001;
    const damping = 2 * Math.sqrt(scaledTension) * scaledFriction;

    // Calculate displacement
    const displacement =
      Math.exp(-damping * x) * Math.cos(scaledTension * x) +
      initialVelocity * Math.sin(scaledTension * x);

    // Scale result to [0, 1] range
    return Math.max(0, Math.min(1, displacement));
  };
}
