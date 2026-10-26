import { function as functionSchema, object, parse } from "valibot";
import type { HashFunction } from "./Hashers";

const hashModuleSchema = object({
	default: functionSchema("Export your hash function with `export default`."),
});
/** Validate exports/results, not privileges: playground code is not sandboxed. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This function is the schema boundary for reader-supplied module exports.
export function customHash(module: unknown): HashFunction {
	const { default: hash } = parse(hashModuleSchema, module);
	return (value, seed) => {
		const result = hash(value, seed);
		// oxlint-disable-next-line anti-slop/no-runtime-typeof -- Reader results are the I/O boundary; validate integers without schema allocations in this hot loop.
		if (typeof result !== "number" || !Number.isInteger(result)) {
			throw new TypeError("The hash function must return a finite integer.");
		}
		return result;
	};
}
