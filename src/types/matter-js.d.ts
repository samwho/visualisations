// Matter 0.20.0's source modules share its public types but lack declarations.
declare module "matter-js/src/factory/Bodies" {
	export { Bodies as default } from "matter-js";
}

declare module "matter-js/src/body/Composite" {
	export { Composite as default } from "matter-js";
}

declare module "matter-js/src/constraint/Constraint" {
	export { Constraint as default } from "matter-js";
}

declare module "matter-js/src/core/Engine" {
	export { Engine as default } from "matter-js";
}

declare module "matter-js/src/core/Runner" {
	export { Runner as default } from "matter-js";
}

declare module "matter-js/src/core/Sleeping" {
	export { Sleeping as default } from "matter-js";
}
