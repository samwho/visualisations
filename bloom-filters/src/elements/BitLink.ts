import { attributeListener, customElement } from "../core/Decorators";
import { default as BloomFilter, Bit } from "./BloomFilter";
import gsap from "gsap";

@customElement("s-bitlink")
export default class BitLink extends HTMLElement {
  get bf(): BloomFilter | null {
    const self = this as unknown as HTMLElement;
    const id = self.getAttribute("bfid");
    if (!id) {
      throw new Error("Missing bfid");
    }

    const elem = document.getElementById(id);
    if (!elem) {
      return null;
    }

    return (elem as any).application as BloomFilter;
  }

  get bit(): Bit | null {
    const self = this as unknown as HTMLElement;
    const bit = parseInt(self.getAttribute("bit")!);
    const bf = this.bf;
    if (!bf) {
      return null;
    }
    return bf.bits[bit];
  }

  @attributeListener("bit")
  bitChanged() {
    const bf = this.bf;
    if (!bf) {
      return;
    }

    const bit = this.bit;
    if (!bit) {
      return;
    }

    const self = this as unknown as HTMLElement;
    const container = self.querySelector("span");
    if (!container) {
      return;
    }

    const span = container.querySelector("span");
    if (!span) {
      return;
    }

    span.innerText = self.getAttribute("bit")!;

    gsap.getTweensOf(container).forEach((tween) => {
      tween.progress(1);
    });

    let timeline = bf
      .timeline()
      .to(container, {
        duration: 0.5,
        backgroundColor: bit.color.toRgbaString(),
        ease: "power2.out",
      })
      .to(
        span,
        {
          duration: 0.5,
          color: bit.isSet(false) ? "white" : "#2e3440",
          ease: "power2.out",
        },
        0
      );
    timeline.play();
  }

  init() {
    const self = this as unknown as HTMLElement;
    const ogText = self.innerText;
    self.innerText = "";
    self.setAttribute("bit", ogText);

    const container = document.createElement("span");
    container.style.fontSize = "0.9rem";
    container.style.display = "inline-block";
    container.style.lineHeight = "0px";
    container.style.borderRadius = "50%";
    container.style.backgroundColor = this.bit?.color.toRgbaString() ?? "white";
    container.style.cursor = "pointer";
    container.style.userSelect = "none";
    self.appendChild(container);

    const span = document.createElement("span");
    span.innerText = ogText;
    span.style.display = "inline-block";
    span.style.paddingTop = "50%";
    span.style.paddingBottom = "50%";
    span.style.marginLeft = "6px";
    span.style.marginRight = "6px";
    span.style.color = this.bit?.isSet(false) ? "white" : "#2e3440";
    span.style.fontWeight = "bold";
    span.style.width = "1.25em";
    span.style.textAlign = "center";
    container.appendChild(span);

    const bf = this.bf;
    if (!bf) {
      return;
    }

    bf.onUpdate((e) => {
      const bit = this.bit;
      if (!bit) return;

      if (e.bit.index !== bit.index) {
        return;
      }
      console.log("onUpdate");

      gsap.getTweensOf(container).forEach((tween) => {
        tween.progress(1);
      });

      let timeline = bf
        .timeline()
        .to(container, {
          duration: 0.5,
          backgroundColor: e.bit.color.toRgbaString(),
          ease: "power2.out",
        })
        .to(
          span,
          {
            duration: 0.5,
            color: e.bit.isSet(false) ? "white" : "#2e3440",
            ease: "power2.out",
          },
          0
        );
      timeline.play();
    });

    bf.onHighlight((e) => {
      const bit = this.bit;
      if (!bit) return;
      if (e.bit.index !== bit.index) {
        return;
      }

      gsap.getTweensOf(container).forEach((tween) => {
        tween.progress(1);
      });

      bf.timeline()
        .to(container, {
          ease: "power4.out",
          overwrite: true,
          keyframes: [
            {
              backgroundColor: Bit.highlightColor.toHex(),
              duration: 0.2,
            },
          ],
        })
        .play();
    });

    bf.onUnhighlight((e) => {
      const bit = this.bit;
      if (!bit) return;
      if (e.bit.index !== bit.index) {
        return;
      }

      gsap.getTweensOf(container).forEach((tween) => {
        tween.progress(1);
      });

      const color = bit.color.toRgbaString();
      bf.timeline()
        .to(container, {
          ease: "power4.out",
          overwrite: true,
          keyframes: [{ backgroundColor: color, duration: 0.3 }],
        })
        .play();
    });

    container.addEventListener("click", async (e) => {
      const bit = this.bit;
      if (!bit) return;
      await bf.temporarilyHighlightBit(bit.index);
    });
    container.addEventListener("pointerenter", (e) => {
      const bit = this.bit;
      if (!bit) return;
      bf.highlightBit(bit.index);
    });
    container.addEventListener("pointerleave", (e) => {
      const bit = this.bit;
      if (!bit) return;
      bf.unhighlightBit(bit.index);
    });

    bf.onCheck((e) => {
      const bit = this.bit;
      if (!bit) return;
      if (e.bit.index !== bit.index) {
        return;
      }

      gsap.getTweensOf(container).forEach((tween) => {
        tween.progress(1);
      });

      const color = e.bit.isSet(false)
        ? Bit.checkHitColor.toRgbaString()
        : Bit.checkMissColor.toRgbaString();
      bf.timeline()
        .to(container, {
          ease: "power4.out",
          overwrite: true,
          keyframes: [
            {
              backgroundColor: color,
              duration: 0.2,
            },
            { backgroundColor: color, duration: 1 },
            { backgroundColor: e.bit.color.toRgbaString(), duration: 0.3 },
          ],
        })
        .play();
    });
  }

  async connectedCallback() {
    document.addEventListener("DOMContentLoaded", (e) => {
      this.init();
    });
  }
}
