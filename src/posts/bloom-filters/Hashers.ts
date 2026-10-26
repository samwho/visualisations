/*! hash.js (MIT), inherits and minimalistic-assert (ISC): /js/licenses/hash.js.txt */
import { sha1, sha256, sha512 } from "hash.js";

export const hashNames = ["sha1", "sha256", "sha512"] as const;
export type HashName = (typeof hashNames)[number];
const hashers = { sha1, sha256, sha512 };
const encoder = new TextEncoder();

/** Match the original hash.js wrapper: the first eight digest bytes, big-endian. */
export function hash(value: string, name: HashName): bigint {
	const digest = hashers[name]().update(encoder.encode(value)).digest();
	return new DataView(new Uint8Array(digest).buffer).getBigUint64(0);
}

export function indices(value: string, size = 32): number[] {
	return hashNames.map((name) => Number(hash(value, name) % BigInt(size)));
}
