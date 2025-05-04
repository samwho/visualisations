import { BaseElement } from "../core/BaseElement";
import {
  EveryNSampler,
  RandomSampler,
  SimpleReservoir,
  type Sampler,
} from "../core/Samplers";
import { getRandomLogLevel, LogMessage } from "../core/Logs";
import { randBetween, setDynamicInterval } from "../core/Utils";

const elementName = `s-log-stream`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  --font-size: 1rem;
  --line-height: 1.5;
  --padding: 0.3rem;
  --total-height: calc((var(--font-size) * 5 * var(--line-height) + var(--padding) * 2 + 2px));

  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  border: 2px solid #bbbbbb;
  border-radius: 10px;
  font-family: var(--code-font);
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  contain: strict;
  height: var(--total-height);
  line-height: var(--line-height);
  padding: var(--padding);
  content-visibility: auto;
}

${elementName} .message {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 0.5rem;
  padding-left: 0.5rem;
  font-size: var(--font-size);
  line-height: var(--line-height);
  height: calc(var(--font-size) * 1.5);
  white-space: nowrap;
}

${elementName} .message.filtered {
  filter: opacity(0.5);
}

${elementName} .timestamp {
  color: #888888;
}

${elementName} .level {
  font-weight: bold;
}
${elementName} .level.info {
  color: var(--palette-blue);
}
${elementName} .level.warn {
  color: var(--palette-yellow);
}
${elementName} .level.error {
  color: var(--palette-red);
}
`;
document.head.appendChild(stylesheet);

export class LogStream extends BaseElement {
  _cancel: () => void = () => {};
  sampler: Sampler<LogMessage> | undefined = undefined;

  _onEmitCallbacks: ((logs: LogMessage[]) => void)[] = [];
  _reservoirInterval: ReturnType<typeof setInterval> | undefined = undefined;

  onEmit(callback: (logs: LogMessage[]) => void) {
    this._onEmitCallbacks.push(callback);
  }

  emit(logs: LogMessage[]) {
    for (const callback of this._onEmitCallbacks) {
      callback(logs);
    }
  }

  init() {
    for (let i = 0; i < 5; i++) {
      const log = new LogMessage(getRandomLogLevel());
      this.appendChild(log.toElement());
    }
    this.generateLogs();

    if (this.sampleRate) {
      this.sampler = new RandomSampler<LogMessage>(this.sampleRate);
    }
    if (this.everyN) {
      this.sampler = new EveryNSampler<LogMessage>(this.everyN);
    }
    if (this.reservoirSize) {
      let selected: LogMessage[] = [];
      let unselected: LogMessage[] = [];

      const reservoir = new SimpleReservoir<LogMessage>(this.reservoirSize);
      reservoir.onAdd((log) => {
        selected.push(log);
      });
      reservoir.onRemove((log) => {
        if (selected.includes(log)) {
          selected.splice(selected.indexOf(log), 1);
        }
        unselected.push(log);
      });

      this._reservoirInterval = setInterval(() => {
        for (const log of selected) {
          log.selected = true;
          this.appendLog(log);
        }
        for (const log of unselected) {
          log.selected = false;
          this.appendLog(log);
        }
        selected = [];
        unselected = [];
        reservoir.reset();
      }, 1000);

      this.sampler = reservoir;
    }

    this.onDisconnect(() => this._cancel());

    this.onHide(() => {
      this._cancel();
    });

    this.onVisible(() => {
      this.generateLogs();
    });
  }

  get mps(): number {
    return this.getAttribute("mps") ? parseInt(this.getAttribute("mps")!) : 7;
  }

  set mps(value: number) {
    this.setAttribute("mps", value.toString());
    this.generateLogs();
  }

  get sampleRate(): number | undefined {
    return this.getAttribute("sample-rate")
      ? parseFloat(this.getAttribute("sample-rate")!)
      : undefined;
  }

  set sampleRate(value: number) {
    this.setAttribute("sample-rate", value.toString());
    this.sampler = new RandomSampler<LogMessage>(value);
  }

  get everyN(): number | undefined {
    return this.getAttribute("every-n")
      ? parseInt(this.getAttribute("every-n")!)
      : undefined;
  }

  get reservoirSize(): number | undefined {
    return this.getAttribute("reservoir-size")
      ? parseInt(this.getAttribute("reservoir-size")!)
      : undefined;
  }

  get troughDuration(): number {
    return this.getAttribute("trough-duration")
      ? parseFloat(this.getAttribute("trough-duration")!)
      : 1;
  }

  get peakDuration(): number {
    return this.getAttribute("peak-duration")
      ? parseFloat(this.getAttribute("peak-duration")!)
      : 1;
  }

  get rampDuration(): number {
    return this.getAttribute("ramp-duration")
      ? parseFloat(this.getAttribute("ramp-duration")!)
      : 1;
  }

  get peakMultiplier(): number {
    return (
      1 /
      (this.getAttribute("peak-multiplier")
        ? parseFloat(this.getAttribute("peak-multiplier")!)
        : 1)
    );
  }

  get troughMultiplier(): number {
    return (
      1 /
      (this.getAttribute("trough-multiplier")
        ? parseFloat(this.getAttribute("trough-multiplier")!)
        : 1)
    );
  }

  get jitter(): [number, number] {
    const jitter = this.getAttribute("jitter");
    if (!jitter) return [1, 1];
    const [min, max] = jitter.split(",").map((s) => parseFloat(s));
    return [min, max];
  }

  async generateLogs() {
    this._cancel();
    this._cancel = setDynamicInterval(
      () => {
        const log = new LogMessage(getRandomLogLevel());
        if (this.sampler) {
          if (this.sampler instanceof SimpleReservoir) {
            this.sampler.sample(log);
          } else {
            if (this.sampler.sample(log)) {
              log.selected = true;
            } else {
              log.selected = false;
            }
            this.appendLog(log);
          }
        } else {
          this.appendLog(log);
        }
      },
      () => this.timeToNextLog()
    );
  }

  timeToNextLog(): number {
    const baseInterval = 1000 / this.mps;

    const totalCycleLength =
      this.troughDuration + this.peakDuration + 2 * this.rampDuration;
    const time = (Date.now() / 1000) % totalCycleLength;

    let interval;
    if (time < this.rampDuration) {
      // Ramp-up phase (slow to fast)
      const progress = time / this.rampDuration;
      interval =
        baseInterval *
        (this.troughMultiplier -
          progress * (this.troughMultiplier - this.peakMultiplier));
    } else if (time < this.rampDuration + this.peakDuration) {
      // Peak phase (fast logs)
      interval = baseInterval * this.peakMultiplier;
    } else if (time < 2 * this.rampDuration + this.peakDuration) {
      // Ramp-down phase (fast to slow)
      const progress =
        (time - this.rampDuration - this.peakDuration) / this.rampDuration;
      interval =
        baseInterval *
        (this.peakMultiplier +
          progress * (this.troughMultiplier - this.peakMultiplier));
    } else {
      // Trough phase (slow logs)
      interval = baseInterval * this.troughMultiplier;
    }

    const [minJitter, maxJitter] = this.jitter;
    const jitter = randBetween(minJitter, maxJitter);
    return interval * jitter;
  }

  appendLog(log: LogMessage) {
    for (let i = 0; i < this.children.length - 1; i++) {
      const above = this.children[i];
      const below = this.children[i + 1];

      absorbSelector(above, below, ".timestamp");
      absorbSelector(above, below, ".content");
      absorbSelector(above, below, ".level");

      setClasses(above, below, ".level");

      above.classList.toggle("filtered", below.classList.contains("filtered"));
    }

    const last = this.lastChild! as HTMLElement;
    const timestamp = last.querySelector(".timestamp")!;
    const content = last.querySelector(".content")!;
    const level = last.querySelector(".level")!;

    setText(timestamp, log.timestamp.toLocaleTimeString());
    setText(content, `- ${log.content}`);
    setText(level, `${log.level.charAt(0).toUpperCase()}`);

    removeClasses(level);
    level.classList.add("level");
    level.classList.add(log.level.toLowerCase());

    last.classList.toggle("filtered", !log.selected);

    this.emit([log]);
  }
}

function removeClasses(a: Element) {
  a.classList.value = "";
}

function setClasses(a: Element, b: Element, selector: string) {
  const ae = a.querySelector(selector)!;
  const be = b.querySelector(selector)!;

  removeClasses(ae);

  be.classList.forEach((cls) => {
    ae.classList.add(cls);
  });
}

function setText(a: Element, s: string) {
  a.firstChild!.nodeValue = s;
}

function absorbText(a: Element, b: Element) {
  a.firstChild!.nodeValue = b.firstChild!.nodeValue;
}

function absorbSelector(a: Element, b: Element, selector: string) {
  const ae = a.querySelector(selector)!;
  const be = b.querySelector(selector)!;
  absorbText(ae, be);
}
