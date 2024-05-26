import { Item, Priority } from "../graphics/Item";
import { Queue } from "../graphics/Queue";
import { Application } from "./Application";
import { getColor } from "./Colors";

export class Tasklist {
  static fromId(id: string, application: Application) {
    const ul = document.getElementById(id) as HTMLUListElement;
    if (!ul) {
      throw new Error(`Element with id ${id} not found`);
    }
    return new Tasklist(ul, application);
  }

  private _tasks: Task[] = [];

  private constructor(ul: HTMLUListElement, application: Application) {
    for (const li of ul.querySelectorAll("li")) {
      this._tasks.push(Task.fromLi(li, application));
    }
  }
}

class Task {
  static fromLi(li: HTMLLIElement, application: Application) {
    return new Task(li, application);
  }

  li: HTMLLIElement;
  private _complete: boolean = false;
  private _conditions: Condition[] = [];
  private _onCompleteCallbacks: (() => void)[] = [];

  private constructor(li: HTMLLIElement, application: Application) {
    this.li = li;

    const conditions = this.li.getAttribute("conditions");
    if (!conditions) {
      throw new Error("Missing conditions attribute");
    }

    this.onComplete(() => this.li.classList.add("completed"));

    for (const condition of conditions.split(" ")) {
      let [key, args] = condition.split("[");
      if (args) {
        args = args.substring(0, args.length - 1);
      } else {
        args = "";
      }

      if (!(key in CONDITIONS)) {
        throw new Error(`Unknown condition: ${key}`);
      }

      const Condition = CONDITIONS[key] as new (
        application: Application,
        args: string
      ) => Condition;
      const instance = new Condition(application, args);
      instance.onComplete(() => {
        if (this.isComplete()) {
          this.complete();
        }
      });
      this._conditions.push(instance);

      if (li.getAttribute("progress-bar") === "true") {
        const progressBar = document.createElement("div");
        progressBar.style.position = "relative";
        progressBar.style.width = "5rem";
        progressBar.style.height = "1.25rem";
        progressBar.style.borderRadius = "0.25rem";
        progressBar.style.overflow = "hidden";
        progressBar.style.backgroundColor = "#aaaaaa";
        progressBar.style.display = "inline-block";
        progressBar.style.verticalAlign = "sub";
        progressBar.style.marginLeft = "0.5rem";
        progressBar.style.marginRight = "0.5rem";

        const text = document.createElement("div");
        text.textContent = "0%";
        text.style.color = "#ffffff";
        text.style.fontSize = "0.75rem";
        text.style.fontWeight = "bold";
        text.style.position = "absolute";
        text.style.top = "0";
        text.style.left = "0";
        text.style.width = "100%";
        text.style.height = "100%";
        text.style.textAlign = "center";
        text.style.lineHeight = "1.25rem";

        const innerBar = document.createElement("div");
        innerBar.style.width = "0%";
        innerBar.style.height = "100%";
        innerBar.style.backgroundColor = getColor(2).toRgbaString();
        innerBar.style.transition = "width 0.5s";

        progressBar.appendChild(innerBar);
        progressBar.appendChild(text);

        li.prepend(progressBar);

        instance.onProgress((progress) => {
          innerBar.style.width = `${progress * 100}%`;
          text.textContent = `${Math.round(progress * 100)}%`;
        });

        instance.onComplete(() => {
          innerBar.style.width = "100%";
          text.textContent = "100%";
        });
      }
    }
  }

  isComplete() {
    return this._conditions.every((c) => c.isComplete());
  }

  private complete() {
    if (this._complete) {
      return;
    }
    this._complete = true;
    for (const callback of this._onCompleteCallbacks) {
      callback();
    }
  }

  onComplete(callback: () => void) {
    this._onCompleteCallbacks.push(callback);
  }
}

abstract class Condition<Arguments = string[]> {
  private _complete: boolean = false;
  private _completeCallbacks: (() => void)[] = [];
  private _progressCallbacks: ((progress: number) => void)[] = [];
  private _application: Application;

  protected args: Arguments;

  constructor(application: Application, args: string) {
    this._application = application;
    this.args = this.parseArgs(args);
    this.init();
  }

  get events() {
    return this._application.events;
  }

  setProgress(progress: number) {
    if (this.isComplete()) {
      return;
    }
    if (progress < 0 || progress > 1) {
      throw new Error(`Progress must be between 0 and 1, got ${progress}`);
    }
    for (const callback of this._progressCallbacks) {
      callback(progress);
    }
  }

  isComplete() {
    return this._complete;
  }

  onComplete(callback: () => void) {
    this._completeCallbacks.push(callback);
  }

  onProgress(callback: (progress: number) => void) {
    this._progressCallbacks.push(callback);
  }

  protected parseArgs(args: string): Arguments {
    return args.split(",") as unknown as Arguments;
  }

  abstract init(): void;

  protected complete() {
    if (this._complete) {
      return;
    }
    this._complete = true;
    for (const callback of this._completeCallbacks) {
      callback();
    }
  }
}

abstract class CountCondition extends Condition<{ count: number }> {
  private _count: number = 0;

  override parseArgs(args: string): { count: number } {
    const count = parseInt(args);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`Invalid count: ${args}`);
    }
    return { count };
  }

  increment() {
    this._count++;
    this.setProgress(this._count / (this.args.count || 1));
    if (!this.args.count || this._count >= this.args.count) {
      this.complete();
    }
  }
}

abstract class CountPriorityCondition extends Condition<{
  count: number;
  priority: Priority;
}> {
  private _count: number = 0;

  override parseArgs(args: string): { count: number; priority: Priority } {
    let [count, priority] = args.split(",");

    if (!count) {
      throw new Error("Missing count");
    }
    if (!priority) {
      throw new Error("Missing priority");
    }

    const ret = {
      count: parseInt(count),
      priority: priority === "hp" ? Priority.HIGH : Priority.LOW,
    };
    return ret;
  }

  increment() {
    this._count++;
    this.setProgress(this._count / (this.args.count || 1));
    if (!this.args.count || this._count >= this.args.count) {
      this.complete();
    }
  }

  requestMatchesPriority(item: Item): boolean {
    return (
      this.args.priority === undefined || item.priority === this.args.priority
    );
  }
}

const CONDITIONS = {
  "send-requests": class extends CountPriorityCondition {
    override init() {
      this.events.on("request-created", (item) => {
        if (this.requestMatchesPriority(item)) {
          this.increment();
        }
      });
    }
  },
  "drop-requests": class extends CountPriorityCondition {
    override init() {
      this.events.on("request-dropped", (item) => {
        if (this.requestMatchesPriority(item)) {
          this.increment();
        }
      });
    }
  },
  "queue-requests": class extends CountPriorityCondition {
    override init() {
      this.events.on("request-queued", (item) => {
        if (this.requestMatchesPriority(item)) {
          this.increment();
        }
      });
    }
  },
  "complete-requests": class extends CountPriorityCondition {
    override init() {
      this.events.on("request-served", (item) => {
        if (this.requestMatchesPriority(item)) {
          this.increment();
        }
      });
    }
  },
  "timed-out-requests": class extends CountPriorityCondition {
    override init() {
      this.events.on("request-timeout", (item) => {
        if (this.requestMatchesPriority(item)) {
          this.increment();
        }
      });
    }
  },
  "queue-size": class extends CountCondition {
    override init() {
      this.events.on("request-queued", (_, queue) => {
        if (queue.size >= this.args.count) {
          this.complete();
        }
      });
    }
  },
  "request-timeout": class extends Condition {
    override init() {
      this.events.on("request-timeout", () => this.complete());
    }
  },
  "added-alongside-1-timeout": class extends Condition {
    override init() {
      this.events.on("request-queued", (_, queue) => {
        let timeouts = 0;
        queue.eachItem((item) => {
          if (item.timedOut) {
            timeouts++;
          }
        });

        if (timeouts >= 1) {
          this.complete();
        }
      });
    }
  },
  "send-hp-request-while-1-lp-request-queued": class extends Condition {
    override init() {
      this.events.on("request-queued", (item, queue) => {
        if (!item.isHighPriority()) {
          return;
        }

        let lpRequests = 0;
        queue.eachItem((i) => {
          if (i.isLowPriority()) {
            lpRequests++;
          }
        });

        if (lpRequests < 1) {
          return;
        }

        this.complete();
      });
    }
  },
  "send-hp-request-while-queue-full": class extends Condition {
    override init(): void {
      this.events.on("request-dropped", (item, dropper) => {
        if (dropper instanceof Queue && item.isHighPriority()) {
          this.complete();
        }
      });
    }
  },
  "request-dropped-while-queue-not-full": class extends Condition {
    override init(): void {
      this.events.on("request-dropped", (_, dropper) => {
        if (dropper instanceof Queue && dropper.size < dropper.capacity) {
          this.complete();
        }
      });
    }
  },
};
