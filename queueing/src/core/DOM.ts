function createNode<T extends HTMLElement>(
  f: () => T,
  opts: ElementOptions = {},
  ...children: HTMLElement[]
): T {
  const elem = f();
  setOpts(opts, elem, "id");
  if (opts.style) {
    Object.assign(elem.style, opts.style);
  }
  if (opts.classes) {
    elem.classList.add(...opts.classes);
  }
  if (opts.data) {
    for (const [key, value] of Object.entries(opts.data)) {
      elem.setAttribute(`data-${key}`, value);
    }
  }
  if (opts.attributes) {
    for (const [key, value] of Object.entries(opts.attributes)) {
      elem.setAttribute(key, value);
    }
  }
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}

function setOpts(opts: any, elem: HTMLElement, ...keys: string[]) {
  for (const key of keys) {
    if (opts[key] !== undefined) {
      elem[key] = opts[key];
    }
  }
}

interface ElementOptions {
  id?: string;
  classes?: string[];
  style?: Partial<CSSStyleDeclaration>;
  data?: Record<string, string>;
  attributes?: Record<string, string>;
}

interface FormOptions extends ElementOptions {
  onSubmit?: (e: SubmitEvent) => void;
}

export function form(
  opts: FormOptions = {},
  ...children: HTMLElement[]
): HTMLFormElement {
  const node = createNode(
    () => document.createElement("form"),
    opts,
    ...children
  );
  if (opts.onSubmit) {
    node.addEventListener("submit", (e) => {
      e.preventDefault();
      opts.onSubmit!(e);
    });
  }
  return node;
}

interface InputOptions extends ElementOptions {
  type: string;
  placeholder?: string;
  maxLength?: number;
  value?: string | null;
  min?: string | null;
  max?: string | null;
  step?: string | null;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
}

export function input(
  opts: InputOptions,
  ...children: HTMLElement[]
): HTMLInputElement {
  return createNode(
    () => {
      const elem = document.createElement("input");
      setOpts(
        opts,
        elem,
        "value",
        "type",
        "step",
        "min",
        "max",
        "maxLength",
        "placeholder"
      );
      if (opts.onInput) {
        elem.addEventListener("input", (e) => {
          e.preventDefault();
          opts.onInput!(e as InputEvent);
        });
      }
      if (opts.onChange) {
        elem.addEventListener("change", (e) => {
          e.preventDefault();
          opts.onChange!(e);
        });
      }
      return elem;
    },
    opts,
    ...children
  );
}

export function textInput(
  placeholder: string,
  opts?: Partial<InputOptions>
): HTMLInputElement {
  if (!opts) opts = {};
  return input({ ...opts, type: "text", placeholder });
}

interface ButtonOptions extends ElementOptions {
  text: string;
  onClick: (e: MouseEvent) => void;
}

export function button(
  opts: ButtonOptions,
  ...children: HTMLElement[]
): HTMLButtonElement {
  return createNode(
    () => {
      const elem = document.createElement("button");
      elem.innerText = opts.text;
      elem.addEventListener("click", (e) => {
        e.preventDefault();
        opts.onClick(e);
      });
      return elem;
    },
    opts,
    ...children
  );
}

export function div(
  opts: ElementOptions = {},
  ...children: HTMLElement[]
): HTMLDivElement {
  return createNode(() => document.createElement("div"), opts, ...children);
}

export function style(css: string): HTMLStyleElement {
  const elem = document.createElement("style");
  elem.innerHTML = css;
  return elem;
}

interface TableOptions extends ElementOptions {
  headers?: HTMLTableCellElement[];
}

export function table(
  opts: TableOptions = {},
  ...children: HTMLTableRowElement[]
): HTMLTableElement {
  return createNode(
    () => {
      const elem = document.createElement("table");
      if (opts.headers) {
        elem.appendChild(thead({}, ...opts.headers));
      }
      return elem;
    },
    opts,
    ...children
  );
}

export function thead(
  opts: ElementOptions = {},
  ...children: HTMLTableCellElement[]
): HTMLTableSectionElement {
  return createNode(() => document.createElement("thead"), opts, ...children);
}

interface TrOptions extends ElementOptions {}

export function tr(
  opts: TrOptions = {},
  ...children: HTMLTableCellElement[]
): HTMLTableRowElement {
  return createNode(() => document.createElement("tr"), opts, ...children);
}

interface TdOptions extends ElementOptions {
  text?: string;
}

export function td(
  opts: TdOptions,
  ...children: HTMLElement[]
): HTMLTableCellElement {
  return createNode(
    () => {
      const elem = document.createElement("td");
      if (opts.text) {
        elem.innerText = opts.text;
      }
      return elem;
    },
    opts,
    ...children
  );
}

interface ThOptions extends ElementOptions {
  text?: string;
}

export function th(
  opts: ThOptions,
  ...children: HTMLElement[]
): HTMLTableCellElement {
  return createNode(
    () => {
      const elem = document.createElement("th");
      if (opts.text) {
        elem.innerText = opts.text;
      }
      return elem;
    },
    opts,
    ...children
  );
}
