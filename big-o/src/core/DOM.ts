interface ExtraOpts {
  class?: string | string[];
  data?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
}

type TagName = keyof HTMLElementTagNameMap;
type Tag = HTMLElementTagNameMap;
type Opts<K extends TagName> = Partial<Omit<Tag[K], "style"> & ExtraOpts>;
type Child = Node | string;

function createElement<T extends TagName>(
  tag: T,
  opts: Opts<T> = {},
  ...children: Child[]
): Tag[T] {
  const { class: classes, data, ...rest } = opts;
  const partialOpts = rest as Partial<Tag[T]>;

  const elem = document.createElement(tag);
  for (const key in partialOpts) {
    if (key in elem) {
      const value = partialOpts[key];
      if (value === undefined) {
        continue;
      }
      elem[key] = value;
    }
  }
  if (classes) {
    if (typeof classes === "string") {
      elem.classList.add(classes);
    } else {
      elem.classList.add(...classes);
    }
  }
  for (const [key, value] of Object.entries(data || {})) {
    elem.setAttribute(`data-${key}`, value);
  }
  for (const [key, value] of Object.entries(opts.style || {})) {
    elem.style[key as any] = value;
  }
  for (const child of children) {
    elem.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child
    );
  }
  return elem;
}

function element<T extends TagName>(
  tag: T
): {
  (cls: `.${string}`, ...children: Child[]): Tag[T];
} & {
  (opts: Opts<T>, ...children: Child[]): Tag[T];
} & {
  (...children: Child[]): Tag[T];
} {
  return (...args: any[]) => {
    let opts: Opts<T> | undefined;
    let children: Child[];

    if (args.length > 0 && typeof args[0] === "string") {
      const first: string = args[0];
      if (first.startsWith(".")) {
        opts = { class: args[0].substring(1).split(".") } as Opts<T>;
        children = args.slice(1) as Child[];
      } else {
        opts = undefined;
        children = args as Child[];
      }
    } else if (args.length > 0 && !(args[0] instanceof Node)) {
      opts = args[0] as Opts<T>;
      children = args.slice(1) as Child[];
    } else {
      children = args;
    }

    return createElement(tag, opts, ...children);
  };
}

export const form = element("form");
export const input = element("input");
export const button = element("button");
export const div = element("div");
export const span = element("span");
export const table = element("table");
export const tbody = element("tbody");
export const thead = element("thead");
export const th = element("th");
export const tr = element("tr");
export const td = element("td");
export const select = element("select");
export const option = element("option");
export const pre = element("pre");
export const code = element("code");
export const label = element("label");
