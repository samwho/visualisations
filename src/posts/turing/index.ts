import "../../shared/components/Button";
import "../../shared/components/FullBleed";
import "../../shared/components/PingForm";
import "../../shared/components/Select";
import "../../shared/components/SplitPane";
import "../../shared/components/RadioGroup";
import "../../shared/components/dogs/HaskieConcerned";
import "../../shared/components/dogs/HaskieConfused";
import "../../shared/components/dogs/Sage";
import "../../shared/components/Callout";
import "./components/Term";
import "./components/Icon";

import { TuringMachine } from "./components/TuringMachine";
import { Compiler } from "./machine/Compiler";
import { makeCodeBlocksFocusable } from "../../shared/core/Accessibility";

makeCodeBlocksFocusable();

function main() {
	const msg = `
Ahoy! 👋

Thank you for taking an interest in how this post works. I was especially
proud of this one. I wanted to show people that Turing completeness really
isn't that hard to understand, at the same time as talking about the man
behind the term.

I also wanted to lean more heavily into the artistic side of my work. The hero
image is hand drawn by me, and the 3 drawings at the bottom of the post were
done by my wife. The colours of the bars at the top are also bespoke to this
post. Going forward, I really want each post to feel meaningfully unique.
I want to treat them as both educational, and art. I hope you like it!

If you have any questions or feedback, please feel free to open an issue at
https://github.com/samwho/visualisations.
  `;

	console.log(msg);
}

window.addEventListener("load", main);

export { TuringMachine, Compiler };
export { compressCode, decodeSharedCode } from "../../shared/core/SharedCode";
export { configureEditorAccessibility } from "../../shared/core/CodeEditorAccessibility";
