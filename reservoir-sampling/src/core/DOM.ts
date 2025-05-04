type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B;

type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P
  >;
}[keyof T];

function createNode<T extends HTMLElement>(
  f: () => T,
  opts: ElementOptions = {},
  ...children: Node[]
): T {
  const elem = f();
  // @ts-expect-error
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
  if (opts.role) {
    elem.setAttribute("role", opts.role);
  }
  if (opts.ariaLabel) {
    elem.setAttribute("aria-label", opts.ariaLabel);
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

function setOpts<E extends HTMLElement>(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  opts: any,
  elem: E,
  ...keys: (keyof Pick<E, WritableKeys<E>>)[]
) {
  for (const key of keys) {
    if (opts[key] !== undefined) {
      // @ts-ignore
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
  role?: string;
  ariaLabel?: string;
}

interface FormOptions extends ElementOptions {
  onSubmit?: (e: SubmitEvent) => void;
}

export function form(
  opts: FormOptions = {},
  ...children: Node[]
): HTMLFormElement {
  const node = createNode(
    () => document.createElement("form"),
    opts,
    ...children
  );
  const onSubmit = opts.onSubmit;
  if (onSubmit) {
    node.addEventListener("submit", (e) => {
      e.preventDefault();
      onSubmit(e);
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
  ...children: Node[]
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
      const onInput = opts.onInput;
      if (onInput) {
        elem.addEventListener("input", (e) => {
          e.preventDefault();
          onInput(e as InputEvent);
        });
      }
      const onChange = opts.onChange;
      if (onChange) {
        elem.addEventListener("change", (e) => {
          e.preventDefault();
          onChange(e);
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
  return input({ ...opts, type: "text", placeholder });
}

interface ButtonOptions extends ElementOptions {
  text?: string;
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
}

export function button(
  opts: ButtonOptions,
  ...children: Node[]
): HTMLButtonElement {
  return createNode(
    () => {
      const elem = document.createElement("button");
      if (opts.text) {
        elem.innerText = opts.text;
      }
      if (opts.disabled) {
        elem.disabled = true;
      }
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

interface DivOptions extends ElementOptions {
  text?: string;
}

export function div(
  opts: DivOptions = {},
  ...children: Node[]
): HTMLDivElement {
  return createNode(
    () => {
      const div = document.createElement("div");
      if (opts.text) {
        div.innerText = opts.text;
      }
      return div;
    },
    opts,
    ...children
  );
}

interface SpanOptions extends ElementOptions {
  text?: string;
}

export function span(
  opts: SpanOptions = {},
  ...children: Node[]
): HTMLSpanElement {
  return createNode(
    () => {
      const span = document.createElement("span");
      if (opts.text) {
        span.innerText = opts.text;
      }
      return span;
    },
    opts,
    ...children
  );
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
        elem.appendChild(thead({}, tr({}, ...opts.headers)));
      }
      return elem;
    },
    opts,
    ...children
  );
}

export function thead(
  opts: ElementOptions = {},
  ...children: HTMLTableRowElement[]
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
  colspan?: number;
  rowspan?: number;
}

export function td(opts: TdOptions, ...children: Node[]): HTMLTableCellElement {
  return createNode(
    () => {
      const elem = document.createElement("td");
      if (opts.text) {
        elem.innerText = opts.text;
      }
      if (opts.colspan !== undefined) {
        elem.colSpan = opts.colspan;
      }
      if (opts.rowspan !== undefined) {
        elem.rowSpan = opts.rowspan;
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

export function th(opts: ThOptions, ...children: Node[]): HTMLTableCellElement {
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

interface SelectOptions extends ElementOptions {
  onChange: (e: Event) => void;
}

export function select(
  opts: SelectOptions,
  ...children: Node[]
): HTMLSelectElement {
  return createNode(
    () => {
      const elem = document.createElement("select");
      elem.addEventListener("change", (e) => {
        e.preventDefault();
        opts.onChange(e);
      });
      return elem;
    },
    opts,
    ...children
  );
}

interface OptionOptions extends ElementOptions {
  value?: string;
  text: string;
}

export function option(
  opts: OptionOptions,
  ...children: Node[]
): HTMLOptionElement {
  return createNode(
    () => {
      const elem = document.createElement("option");
      elem.value = opts.value || opts.text;
      elem.innerText = opts.text;
      return elem;
    },
    opts,
    ...children
  );
}

type Schema = {
  [key: string]:
    | "string"
    | "number"
    | "boolean"
    | "string?"
    | "number?"
    | "boolean?"
    | Schema
    | Schema[];
};

export function toJson<T extends Schema>(
  element: Element,
  schema: T
): {
  [K in keyof T]: T[K] extends `${infer Base}?`
    ? Base extends "number"
      ? number | undefined
      : Base extends "boolean"
      ? boolean | undefined
      : string | undefined
    : T[K] extends "number"
    ? number
    : T[K] extends "boolean"
    ? boolean
    : T[K] extends "string"
    ? string
    : T[K] extends Schema
    ? ReturnType<typeof toJson<T[K]>>
    : T[K] extends Schema[]
    ? Array<ReturnType<typeof toJson<T[K][0]>>>
    : never;
} {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const result: any = {};

  for (const key in schema) {
    const subSchema = schema[key];
    const child = element.querySelector(key);

    if (typeof subSchema === "string") {
      const isOptional = subSchema.endsWith("?");
      const baseType = subSchema.replace("?", "") as
        | "string"
        | "number"
        | "boolean";
      const value = element.getAttribute(key);

      if (value === null) {
        if (!isOptional) {
          throw new Error(`Required field ${key} is missing`);
        }
        result[key] = undefined;
      } else if (baseType === "boolean") {
        result[key] = value === "true";
      } else if (baseType === "number") {
        const parsedValue = Number(value);
        if (Number.isNaN(parsedValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        result[key] = parsedValue;
      } else {
        result[key] = value;
      }
    } else if (Array.isArray(subSchema)) {
      const children = element.querySelectorAll(key);
      result[key] = Array.from(children).map((subChild) =>
        toJson(subChild, subSchema[0])
      );
    } else {
      if (!child) {
        throw new Error(`Element ${key} not found`);
      }
      result[key] = toJson(child, subSchema);
    }
  }

  return result;
}
