import { Application } from "./Application";
import { CustomElement } from "./CustomElement";

export function cached(target: any, name: string) {
  const privateName = `_${name}`;
  Object.defineProperty(target, name, {
    get() {
      return this[privateName];
    },
    set(value) {
      Object.defineProperty(this, name, {
        value,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      this[privateName] = value;
    },
    enumerable: true,
    configurable: true,
  });
}

export function attributeListener(attributeName: string) {
  return function (klass: any, name: any) {
    klass._listeners = klass._listeners || {};
    klass._listeners[attributeName] = name;
  };
}

export function _attributeChangedCallback(
  target: any,
  name: string,
  oldValue: string,
  newValue: string
) {
  if (!target) {
    return;
  }

  const listeners = (target.constructor.prototype as any)._listeners;
  let listener = listeners && listeners[name] && target[listeners[name]];
  if (listener && typeof listener === "function") {
    listener = listener.bind(target);
    switch (listener.length) {
      case 0:
        listener();
        break;
      case 1:
        listener(newValue);
        break;
      case 2:
        listener(oldValue, newValue);
        break;
      default:
        throw new Error("Invalid arity");
    }
  }
}

function _applicationElement(
  elementName: string,
  klass: typeof Application,
  style?: Partial<CSSStyleDeclaration>
) {
  const observedAttributes = Object.keys(
    (klass.prototype as any)._listeners || {}
  );

  const customElementClass = class extends CustomElement {
    static elementName = elementName;
    static observedAttributes = observedAttributes;

    defaultStyle(): Partial<CSSStyleDeclaration> {
      return { ...super.defaultStyle(), ...(style || {}) };
    }

    override initApplication(element: HTMLElement): Application {
      return new klass(element);
    }
  };

  _customElements.push([elementName, customElementClass]);
}

const _customElements: [string, typeof HTMLElement][] = [];

function _customElement(
  elementName: string,
  klass: typeof HTMLElement,
  style?: Partial<CSSStyleDeclaration>
) {
  const subclass = class extends klass {
    static observedAttributes = Object.keys(
      (klass.prototype as any)._listeners || {}
    );
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      _attributeChangedCallback(this, name, oldValue, newValue);
    }

    constructor() {
      super();

      for (const [key, value] of Object.entries(style || {})) {
        this.style[key] = value;
      }
    }
  };

  _customElements.push([elementName, subclass]);
}

export function customElement(
  elementName: string,
  style?: Partial<CSSStyleDeclaration>
) {
  return function (klass: any, _: any) {
    if (klass.prototype instanceof Application) {
      _applicationElement(elementName, klass, style);
    } else if (klass.prototype instanceof HTMLElement) {
      _customElement(elementName, klass, style);
    } else {
      throw new Error(`Invalid class: ${klass}`);
    }
  };
}

export function initCustomElements() {
  for (const [elementName, klass] of _customElements) {
    customElements.define(elementName, klass);
  }
}
