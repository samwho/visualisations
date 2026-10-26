import "../../shared/components/Button";
import "../../shared/components/FullBleed";
import "../../shared/components/PingForm";
import "../../shared/components/Card";
import "../../shared/components/dogs/HaskieConcerned";
import "../../shared/components/dogs/HaskieConfused";
import "../../shared/components/dogs/HaskieTriumphant";
import "../../shared/components/Slider";
import "./components/CallRail";
import { Hexadecimal } from "./components/Hexadecimal";
import "./components/Term";
import "./components/Icon";
import { Memory } from "./components/Memory";
import "./components/MemoryHero";
import "./components/MemoryRef";
import "./components/TimelineControls";
import { prepareCodeReferences } from "../../shared/components/CodeRef";
import { makeCodeBlocksFocusable } from "../../shared/core/Accessibility";

prepareCodeReferences();
makeCodeBlocksFocusable();

const converter = document.getElementById("hexadecimal-converter");
const addressGrid = document.getElementById("hexadecimal-memory");
if (converter instanceof Hexadecimal && addressGrid instanceof Memory) {
	addressGrid.highlightByte(converter.value);
	converter.addEventListener("number-change", (event) => {
		// SAFETY: Hexadecimal emits number-change with a numeric detail.
		addressGrid.highlightByte((event as CustomEvent<number>).detail);
	});
	addressGrid.addEventListener("address-select", (event) => {
		// SAFETY: Memory emits address-select with a numeric detail.
		converter.setValue((event as CustomEvent<number>).detail);
	});
}
