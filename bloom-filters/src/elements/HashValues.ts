import { Hashers } from "../core/Hashers";
import { table, td, th, tr } from "../core/DOM";
import { customElement, attributeListener } from "../core/Decorators";
import HighlightedWord from "./HighlightedWord";
import gsap from "gsap";
import { prefersReducedMotion } from "../core/Accessibility";

@customElement("hash-values")
export default class HashValues extends HTMLElement {
  text: string;
  header2: HTMLTableCellElement;
  mod: number;

  @attributeListener("value")
  valueChanged(value: string) {
    this.text = value;
    this.refresh();
  }

  @attributeListener("hashes")
  hashesChanged() {
    this.querySelector("table")?.remove();
    this.appendChild(this.buildTable());
    this.refresh();
  }

  refresh() {
    if (!this.header2) return;

    this.header2.innerText = `fn("${this.text}")`;
    for (const row of this.querySelectorAll("tr")) {
      const hasher = row.getAttribute("data-hasher")!;
      const value = row.children[1] as HTMLTableCellElement;
      const mod = row.children[2] as HTMLTableCellElement;

      const hash = Hashers.get(hasher)(this.text);
      const bitIndex = ((hash % 0x100000000n) % BigInt(this.mod)).toString(10);

      let bitlink = row.querySelector("s-bitlink");
      if (!bitlink) {
        mod.innerHTML = `<s-bitlink bfid='${this.getAttribute(
          "bfid"
        )}' bit='${bitIndex}'>${bitIndex}</s-bitlink>`;
        bitlink = mod.querySelector("s-bitlink")!;
      } else {
        bitlink.setAttribute(
          "bit",
          ((hash % 0x100000000n) % BigInt(this.mod)).toString(10)
        );
      }

      if (prefersReducedMotion()) {
        value.innerText = (hash % 0x100000000n).toString(10);
      } else {
        gsap.killTweensOf(value);
        gsap.killTweensOf(mod);

        gsap.timeline().to(value, {
          duration: Math.random() * 0.3,
          text: {
            value: (hash % 0x100000000n).toString(10),
            type: "diff",
          },
          ease: "none",
        });
      }
    }
  }

  buildTable(): HTMLTableElement {
    const hashes = this.getAttribute("hashes")?.split(",") ?? [
      "sha1",
      "sha256",
      "sha512",
    ];
    const codeFont = {
      fontFamily: "Fira Code, monospace",
      fontWeight: "bold",
    };
    const thStyle = { color: "#777777", ...codeFont };

    this.header2 = th({
      style: {
        ...thStyle,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
    });
    return table(
      {
        headers: [
          th({ text: "fn", style: thStyle }),
          this.header2,
          th({ text: `% ${this.mod}`, style: thStyle }),
        ],
        style: {
          tableLayout: "fixed",
          border: "none",
        },
      },
      ...Array.from(hashes.entries()).map(([i, name]) => {
        return tr(
          { data: { hasher: name } },
          td({
            text: name,
            style: HighlightedWord.styleFor(name),
          }),
          td({ style: codeFont }),
          td({ style: codeFont })
        );
      })
    );
  }

  async connectedCallback() {
    this.mod = parseInt(this.getAttribute("mod") || "32");
    this.text = this.getAttribute("value") || "";

    this.appendChild(this.buildTable());
    this.refresh();
  }
}
