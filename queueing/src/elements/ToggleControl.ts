export abstract class ToggleControl extends HTMLElement {
  abstract callback(option: string): void;

  formatOption(option: string): string {
    return option;
  }

  getOptions(): string[] {
    let optionsAttribute = this.getAttribute("options");
    if (!optionsAttribute) {
      throw new Error("Missing options attribute");
    }
    return optionsAttribute.split(" ");
  }

  async connectedCallback() {
    this.style.display = "block";

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "stretch";
    div.style.gap = "0.5rem";
    div.style.border = "1.5px solid #111111";
    div.style.fontFamily = "monospace";
    div.style.padding = "0.25rem";
    this.appendChild(div);

    let options = this.getOptions();
    let legend = this.getAttribute("legend");
    if (legend) {
      let legendElem = document.createElement("div");
      legendElem.textContent = legend;
      legendElem.style.flexShrink = "1";
      legendElem.style.textAlign = "center";
      legendElem.style.fontWeight = "bold";
      this.appendChild(legendElem);
    }

    let selected = this.getAttribute("selected");
    if (selected) {
      if (!options.includes(selected)) {
        throw new Error(
          `Selected option ${selected} is not in options ${options}`
        );
      }
    } else {
      selected = options[0];
    }

    this.callback(selected);

    for (let option of options) {
      let button = document.createElement("button");
      button.style.flexGrow = "1";

      if (option === selected) {
        button.style.background = "#111111";
        button.style.color = "#eeeee1";
      } else {
        button.style.background = "none";
        button.style.color = "#111111";
      }

      button.textContent = this.formatOption(option);

      button.addEventListener("click", () => {
        for (let button of this.querySelectorAll("button")) {
          button.style.background = "none";
          button.style.color = "#111111";
        }

        this.callback(option.toString());
        button.style.background = "#111111";
        button.style.color = "#eeeee1";
      });

      div.appendChild(button);
    }
  }
}
