import { FairCoin } from "./Random";

const exp = Math.exp;
const log = Math.log;
const floor = Math.floor;
const random = Math.random;

export interface Sampler<T> {
  sample(item: T): boolean;
}

export class RandomSampler<T> implements Sampler<T> {
  sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  sample(_item: T): boolean {
    return Math.random() < this.sampleRate;
  }
}

export class FairCoinSampler<T> implements Sampler<T> {
  coin: FairCoin;

  constructor() {
    this.coin = FairCoin.random();
  }

  sample(_item: T): boolean {
    return this.coin.flip();
  }
}

export class EveryNSampler<T> implements Sampler<T> {
  n: number;
  count: number;

  constructor(n: number) {
    if (!Number.isInteger(n)) {
      throw new Error(`n must be an integer, got ${n}`);
    }
    this.n = n;
    this.count = 0;
  }

  sample(_item: T): boolean {
    this.count++;
    if (this.count >= this.n) {
      this.count = 0;
      return true;
    }
    return false;
  }
}

export interface Reservoir<T> extends Sampler<T> {
  n: number;
  k: number;
  items: T[];
  reset(): void;
  onAdd(f: (item: T) => void): void;
  onRemove(f: (item: T) => void): void;
}

abstract class BaseReservoir<T> implements Reservoir<T> {
  n: number;
  k: number;
  items: T[];

  constructor(k: number) {
    this.n = 0;
    this.k = k;
    this.items = [];
  }

  reset(): void {
    this.n = 0;
    this.items = [];
  }

  private addListeners: ((item: T) => void)[] = [];
  private removeListeners: ((item: T) => void)[] = [];

  onAdd(listener: (item: T) => void) {
    this.addListeners.push(listener);
  }

  onRemove(listener: (item: T) => void) {
    this.removeListeners.push(listener);
  }

  private notifyAdd(item: T) {
    for (const listener of this.addListeners) {
      listener(item);
    }
  }

  private notifyRemove(item: T) {
    for (const listener of this.removeListeners) {
      listener(item);
    }
  }

  sample(item: T): boolean {
    const index = this.place();
    if (index !== null) {
      if (index >= this.k) {
        throw new Error(
          `Index out of bounds, index: ${index}, length: ${this.items.length}`
        );
      }
      if (this.n >= this.k) {
        this.notifyRemove(this.items[index]);
      }
      this.items[index] = item;
      this.notifyAdd(item);
      this.n++;
      return true;
    }
    this.n++;
    return false;
  }

  abstract place(): number | null;
}

// https://en.wikipedia.org/wiki/Reservoir_sampling#Simple:_Algorithm_R
//
// (* S has items to sample, R will contain the result *)
// ReservoirSample(S[1..n], R[1..k])
//   // fill the reservoir array
//   for i := 1 to k
//       R[i] := S[i]
//   end
//
//   // replace elements with gradually decreasing probability
//   for i := k+1 to n
//     (* randomInteger(a, b) generates a uniform integer from the inclusive range {a, ..., b} *)
//     j := randomInteger(1, i)
//     if j <= k
//         R[j] := S[i]
//     end
//   end
// end
export class SimpleReservoir<T> extends BaseReservoir<T> {
  place(): number | null {
    if (this.n < this.k) {
      return this.n;
    }
    const j = floor(random() * this.n);
    if (j < this.k) {
      return j;
    }
    return null;
  }
}

// https://en.wikipedia.org/wiki/Reservoir_sampling#Optimal:_Algorithm_L
//
// (* S has items to sample, R will contain the result *)
// ReservoirSample(S[1..n], R[1..k])
//   // fill the reservoir array
//   for i = 1 to k
//       R[i] := S[i]
//   end
//
//   (* random() generates a uniform (0,1) random number *)
//   W := exp(log(random())/k)
//
//   while i <= n
//       i := i + floor(log(random())/log(1-W)) + 1
//       if i <= n
//           (* replace a random item of the reservoir with item i *)
//           R[randomInteger(1,k)] := S[i]  // random index between 1 and k, inclusive
//           W := W * exp(log(random())/k)
//       end
//   end
// end
export class OptimalReservoir<T> extends BaseReservoir<T> {
  place(): number | null {
    if (this.n < this.k) return this.n;

    let W = exp(log(random()) / this.k);

    let i = this.k;
    while (i < this.n) {
      i += floor(log(random()) / log(1 - W)) + 1;
      if (i <= this.n) {
        const index = floor(random() * this.k);
        W *= exp(log(random()) / this.k);
        return index;
      } else {
        break;
      }
    }

    return null;
  }
}
