// https://en.wikipedia.org/wiki/Linear_congruential_generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
}

// Sometimes the hand of fate must be forced.
//
// When I was going through the process of having folks review this post over
// video calls, what kept happening was that the example where we're showing
// that coin flips are unfair would keep having really unbalanced counts for the
// number of held vs discarded cards. This was super confusing to the reader
// because I went on to talk about how the two numbers should be roughly equal.
//
// To get around this I've decided to use a seeded random number generator
// with a set of "known-good" seeds. These are seeds that have a maximum diff
// of heads vs tails of 3 over 52 flips.
const goodSeeds = [
  29837, 85592, 70489, 83090, 43637, 31944, 56523, 51522, 81, 30373, 10353,
  82759, 18569, 95722, 24993, 26605, 39484, 78691, 83179, 31060, 9959, 57293,
  27123, 39552, 33012, 16151, 92586, 56317, 46418, 72691, 64607, 93042, 35028,
  73257, 76604, 96579, 10503, 60833, 56843, 76962, 11039, 7407, 24363, 90664,
  67131, 92102, 57773, 34414, 46099, 45265, 77179, 149, 88169, 64008, 47866,
  85100, 64967, 53226, 5563, 1394, 67912, 21204, 54008, 98880, 37948, 89688,
  2147, 43156, 60088, 84638, 25096, 56279, 3171, 3517, 22146, 90988, 32392,
  15071, 52292, 51690, 2250, 73975, 91733, 51071, 47184, 48015, 35883, 78467,
  35027, 71385, 10786, 42934, 94760, 92554, 55541, 93392, 25384, 57850, 86721,
  90982, 25412, 95989, 58659, 50885, 54380, 67134, 16226, 22621, 84092, 32670,
  88131, 75401, 68957, 76943, 64132, 94595, 87442, 1052, 42065, 74237, 66123,
  87480, 32276, 26440, 15902, 93570, 68527, 28453, 9888, 66776, 26711, 3658,
  24422, 33764, 99043, 82891, 27359, 38333, 28662, 26177, 98623, 91188, 98197,
  55518, 60816, 27458, 24547, 99612, 36437, 62915, 61543, 19869, 61018, 57153,
  24642, 43956, 99063, 8628, 76247, 24735, 94267, 36115, 26821, 14498, 29931,
  56404,
];
export class FairCoin {
  private rand: SeededRandom;

  static random(): FairCoin {
    const seed = goodSeeds[Math.floor(Math.random() * goodSeeds.length)];
    return new FairCoin(seed);
  }

  constructor(seed: number) {
    this.rand = new SeededRandom(seed);
  }

  flip(): boolean {
    return this.rand.next() < 0.5;
  }
}

export class HistoryPicker {
  private history: Map<any[], any[]> = new Map();
  private historySize: number = 6;

  pick<T>(arr: T[]): T {
    if (!this.history.has(arr)) {
      this.history.set(arr, []);
    }

    const arrHistory = this.history.get(arr)!;
    let result: T;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      result = arr[Math.floor(Math.random() * arr.length)];
      attempts++;
    } while (arrHistory.includes(result) && attempts <= maxAttempts);

    arrHistory.push(result);
    if (arrHistory.length > this.historySize) {
      arrHistory.shift();
    }

    return result;
  }
}

// function isGoodSeed(seed: number): boolean {
//   const rand = new SeededRandom(seed);
//   let heads = 0;
//   let tails = 0;
//   let maxDiff = 0;
//   for (let i = 0; i < 52; i++) {
//     if (rand.next() < 0.5) {
//       heads++;
//     } else {
//       tails++;
//     }
//
//     const diff = Math.abs(heads - tails);
//     if (diff > maxDiff) {
//       maxDiff = diff;
//     }
//   }
//   return maxDiff < 4;
// }

// const goodSeeds = new Set<number>();
// for (let i = 0; i < 10000; i++) {
//   const seed = Math.floor(Math.random() * 100000);
//   if (isGoodSeed(seed)) {
//     goodSeeds.add(seed);
//   }
// }
//
// for (const seed of goodSeeds) {
//   console.log(`${seed},`);
// }
