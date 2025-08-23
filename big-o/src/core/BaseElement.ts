let id = 0;
function getUniqueID(): string {
  return `element-${id++}`;
}

export class BaseElement extends HTMLElement {
  debug!: boolean;
  onDisconnectCallbacks: (() => void)[] = [];

  _initDone = false;
  afterInitCallbacks: (() => void)[] = [];

  onHiddenCallbacks: (() => void)[] = [];
  onVisibleCallbacks: (() => void)[] = [];

  onResizeCallbacks: (() => void)[] = [];
  onPageResizeCallbacks: (() => void)[] = [];

  elementOffScreen: boolean = false;
  pageNotVisible: boolean = false;

  get hidden() {
    return this.elementOffScreen || this.pageNotVisible;
  }

  isParsed() {
    let el: Node | null = this;
    while (true) {
      if (el.nextSibling) return true;

      el = el.parentNode;
      if (!el) return false;
    }
  }

  connectedCallback() {
    if (this.ownerDocument.readyState === "complete" || this.isParsed()) {
      this.parsedCallback();
      return;
    }

    const callback = () => {
      observer.disconnect();
      this.ownerDocument.removeEventListener("DOMContentLoaded", callback);
      this.parsedCallback();
    };

    const observer = new MutationObserver(() => {
      if (this.isParsed()) {
        callback();
      }
    });

    this.ownerDocument.addEventListener("DOMContentLoaded", () => {
      callback();
    });

    if (!this.parentNode) {
      throw new Error("Element must have a parent node");
    }
    observer.observe(this.parentNode, { childList: true, subtree: true });
  }

  parsedCallback() {
    if (!this.id) {
      this.id = getUniqueID();
    }

    let resizing = false;
    const elementObserver = new ResizeObserver(() => {
      if (resizing) return;
      resizing = true;
      requestAnimationFrame(() => {
        try {
          for (const callback of this.onResizeCallbacks) {
            callback();
          }
        } finally {
          resizing = false;
        }
      });
    });
    elementObserver.observe(this);

    this.onDisconnect(() => elementObserver.disconnect());

    let pageResizing = false;
    const windowResizeHandler = async () => {
      if (pageResizing) return;
      pageResizing = true;
      requestAnimationFrame(() => {
        try {
          for (const callback of this.onPageResizeCallbacks) {
            callback();
          }
        } finally {
          pageResizing = false;
        }
      });
    };
    window.addEventListener("resize", windowResizeHandler);

    this.onDisconnect(() => {
      window.removeEventListener("resize", windowResizeHandler);
    });

    const intersectionObserver = new IntersectionObserver(
      async (entries) => {
        let latestEntry = entries[0];
        for (const entry of entries) {
          if (entry.time > latestEntry.time) {
            latestEntry = entry;
          }
        }

        this.withVisbilityTriggers(() => {
          if (latestEntry.isIntersecting) {
            this.elementOffScreen = false;
          } else {
            this.elementOffScreen = true;
          }
        });
      },
      {
        threshold: 0,
        rootMargin: "5px",
      }
    );
    intersectionObserver.observe(this);

    document.addEventListener("visibilitychange", () => {
      this.withVisbilityTriggers(() => {
        this.pageNotVisible = document.visibilityState !== "visible";
      });
    });

    this.onDisconnect(() => {
      intersectionObserver.disconnect();
    });

    this.init();
    this._initDone = true;
    for (const callback of this.afterInitCallbacks) {
      callback();
    }
  }

  private withVisbilityTriggers(callback: () => void) {
    const hiddenBefore = this.hidden;
    callback();
    const hiddenNow = this.hidden;
    if (hiddenNow && !hiddenBefore) {
      for (const callback of this.onHiddenCallbacks) {
        callback();
      }
    }
    if (!hiddenNow && hiddenBefore) {
      for (const callback of this.onVisibleCallbacks) {
        callback();
      }
    }
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallbacks.push(callback);
  }

  disconnectedCallback() {
    for (const callback of this.onDisconnectCallbacks) {
      callback();
    }
  }

  afterInit(callback: () => void) {
    if (this._initDone) {
      callback();
      return;
    }
    this.afterInitCallbacks.push(callback);
  }

  onHide(callback: () => void) {
    this.onHiddenCallbacks.push(callback);
  }

  onVisible(callback: () => void) {
    this.onVisibleCallbacks.push(callback);
  }

  init() {}

  onResize(f: () => void) {
    this.onResizeCallbacks.push(f);
  }

  onPageResize(f: () => void) {
    this.onPageResizeCallbacks.push(f);
  }
}
