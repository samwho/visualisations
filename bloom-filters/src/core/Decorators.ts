import Application from "./Application";
import CustomElement from "./CustomElement";

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

function _applicationElement(elementName: string, klass: typeof Application) {
  const observedAttributes = Object.keys(
    (klass.prototype as any)._listeners || {}
  );

  const customElementClass = class extends CustomElement {
    static elementName = elementName;
    static observedAttributes = observedAttributes;

    async initApplication(
      root: HTMLElement,
      container: HTMLElement
    ): Promise<Application> {
      return new klass({ root, element: container });
    }
  };

  // @ts-ignore
  customElements.define(elementName, customElementClass);
}

function _customElement(elementName: string, klass: typeof HTMLElement) {
  const subclass = class extends klass {
    static observedAttributes = Object.keys(
      (klass.prototype as any)._listeners || {}
    );
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      _attributeChangedCallback(this, name, oldValue, newValue);
    }
  };

  customElements.define(elementName, subclass);
}

export function customElement(elementName: string) {
  return function (klass: any, _: any) {
    if (klass.prototype instanceof Application) {
      _applicationElement(elementName, klass);
    } else if (klass.prototype instanceof HTMLElement) {
      _customElement(elementName, klass);
    }
  };
}
