interface ExecutionRequest {
  code: string;
  onStart: () => void;
  onComplete: () => void;
  onError?: (message: string) => void;
}

interface CodeMessage {
  id: number;
  code: string;
}

interface BaseMessage {
  id: number;
}

interface StartMessage extends BaseMessage {
  type: "onStart";
}

interface CompleteMessage extends BaseMessage {
  type: "onComplete";
  result: any;
}

interface ErrorMessage extends BaseMessage {
  type: "onError";
  error: string;
}

type WorkerMessage = StartMessage | CompleteMessage | ErrorMessage;

class WorkerPool {
  private workers: Worker[] = [];
  private readyWorkers: Worker[] = [];
  private queue: CodeMessage[] = [];

  private _onWorkerMessage: Array<
    (event: MessageEvent<WorkerMessage>) => void
  > = [];
  private _onWorkerError: Array<(error: ErrorEvent) => void> = [];

  constructor() {
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const numWorkers = Math.max(1, Math.floor(hardwareConcurrency / 2));

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker("/js/big-o/out/code-worker.js");
      this.workers.push(worker);
      this.readyWorkers.push(worker);

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this._onWorkerMessage.forEach((callback) => callback(event));
        const { type } = event.data;
        if (type === "onComplete" || type === "onError") {
          const message = this.queue.pop();
          if (message) {
            worker.postMessage(message);
          } else {
            this.readyWorkers.push(worker);
          }
        }
      };

      worker.onerror = (error) => {
        this._onWorkerError.forEach((callback) => callback(error));
        throw error;
      };
    }
  }

  onWorkerMessage(f: (event: MessageEvent<WorkerMessage>) => void) {
    this._onWorkerMessage.push(f);
  }

  onWorkerError(f: (error: ErrorEvent) => void) {
    this._onWorkerError.push(f);
  }

  postMessage(message: CodeMessage) {
    const worker = this.readyWorkers.pop();
    if (worker) {
      worker.postMessage(message);
    } else {
      this.queue.push(message);
    }
  }
}

class CodeWorker {
  private static instance: CodeWorker;
  private pool: WorkerPool;
  private nextId = 1;
  private pendingRequests = new Map<number, ExecutionRequest>();

  private constructor() {
    this.pool = new WorkerPool();
    this.pool.onWorkerMessage((event) => {
      const { id, type } = event.data;
      const request = this.pendingRequests.get(id);

      if (!request) {
        throw new Error(`No pending request found for id ${id}`);
      }

      switch (type) {
        case "onStart":
          request.onStart();
          break;
        case "onComplete":
          request.onComplete();
          this.pendingRequests.delete(id);
          break;
        case "onError":
          if (request.onError) {
            request.onError(event.data.error);
          } else {
            throw new Error(
              `No error handler found for request ${id}, error: ${event.data.error}`
            );
          }
          this.pendingRequests.delete(id);
          break;
      }
    });

    this.pool.onWorkerError((error) => {
      throw new Error(`Worker error: ${error.message}`);
    });
  }

  public execute(request: ExecutionRequest) {
    const id = this.nextId++;
    this.pendingRequests.set(id, request);
    this.pool.postMessage({ code: request.code, id });
  }

  public static getInstance(): CodeWorker {
    if (!CodeWorker.instance) {
      CodeWorker.instance = new CodeWorker();
    }
    return CodeWorker.instance;
  }
}

export function init(): void {
  CodeWorker.getInstance();
}

export function exec(request: ExecutionRequest) {
  CodeWorker.getInstance().execute(request);
}
