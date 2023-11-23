export default abstract class ToggleControl extends HTMLElement {
  abstract callback(option: string);

  formatOption(option: string): string {
    return option;
  }

  async connectedCallback() {
    this.style.display = "flex";
    this.style.alignItems = "stretch";
    this.style.gap = "0.5rem";
    this.style.border = "1.5px solid #111111";
    this.style.fontFamily = "monospace";
    this.style.padding = "0.25rem";

    let optionsAttribute = this.getAttribute("options");
    if (!optionsAttribute) {
      throw new Error("Missing options attribute");
    }
    let options = optionsAttribute.split(" ").map(parseFloat);

    let legend = this.getAttribute("legend");
    if (legend) {
      let legendElem = document.createElement("div");
      legendElem.textContent = legend;
      legendElem.style.flexShrink = "1";
      legendElem.style.textAlign = "center";
      legendElem.style.fontWeight = "bold";
      this.appendChild(legendElem);
    }

    let selectedAttribute = this.getAttribute("selected");
    let selected: number;
    if (selectedAttribute) {
      selected = parseFloat(selectedAttribute);
      if (!options.includes(selected)) {
        throw new Error(
          `Selected option ${selected} is not in options ${options}`
        );
      }
    } else {
      selected = options[0];
    }
    this.callback(selected.toString());

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

      button.textContent = this.formatOption(option.toString());

      button.addEventListener("click", () => {
        for (let button of this.querySelectorAll("button")) {
          button.style.background = "none";
          button.style.color = "#111111";
        }

        this.callback(option.toString());
        button.style.background = "#111111";
        button.style.color = "#eeeee1";
      });
      this.appendChild(button);
    }
  }
}
