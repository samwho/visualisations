// export async function setTimeout(
//   callback: () => void,
//   ms: number
// ): Promise<void> {
//   await sleep(ms);
//   callback();
// }
//
// export async function setInterval(
//   callback: () => void,
//   ms: number
// ): Promise<void> {
//   while (true) {
//     await sleep(ms);
//     callback();
//   }
// }

export const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
