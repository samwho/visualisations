import { stringSumCollisions } from "./StringSumCollisions";

export type Hasher = "murmur3" | "simple" | "stringSum";
export type HashFunction = (value: string, seed?: number) => number;
export type Values =
	| "random"
	| "randomLonger"
	| "randomUUID"
	| "intToStr"
	| "stringSumDos"
	| "randomIpAddress"
	| "murmur3Collisions"
	| "xxhash32Collisions"
	| "farmhash32Collisions"
	| "wyhash32Collisions"
	| "fasthash32Collisions"
	| "commonWords"
	| "randomIP";
export type ValueFunction = (index: number) => string;

/*! MurmurHash3 x86/32, adapted from Gary Court's murmurhash-js.
 * Copyright (c) 2011 Gary Court (MIT): /js/licenses/hashing.txt
 * https://github.com/garycourt/murmurhash-js — ASCII bytes, as in the original post.
 */
export function murmur3(key: string, seed = 0): number {
	let hash = seed;
	const bytes = key.length - (key.length & 3);
	const mix = (value: number) => {
		let k = Math.imul(value, 0xcc9e2d51);
		k = (k << 15) | (k >>> 17);
		return Math.imul(k, 0x1b873593);
	};

	for (let i = 0; i < bytes; i += 4) {
		hash ^= mix(
			(key.charCodeAt(i) & 255) |
				((key.charCodeAt(i + 1) & 255) << 8) |
				((key.charCodeAt(i + 2) & 255) << 16) |
				((key.charCodeAt(i + 3) & 255) << 24),
		);
		hash = (hash << 13) | (hash >>> 19);
		hash = (Math.imul(hash, 5) + 0xe6546b64) | 0;
	}
	let tail = 0;
	for (let i = bytes; i < key.length; i++) {
		tail |= (key.charCodeAt(i) & 255) << ((i - bytes) * 8);
	}
	hash ^= mix(tail);
	hash ^= key.length;
	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;
	return hash >>> 0;
}

export function stringSum(key: string): number {
	let hash = 0;
	for (const char of key) {
		hash += char.charCodeAt(0);
	}
	return hash % 1000000;
}

export function simpleHash(key: string): number {
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
	}
	return hash;
}

export function getHashFunction(name: Hasher): HashFunction {
	return { murmur3, simple: simpleHash, stringSum }[name];
}

function randomString(length: number, random = Math.random): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += String.fromCharCode(97 + Math.floor(random() * 26));
	}
	return result;
}

// crypto.randomUUID is unavailable on the LAN HTTP development origin.
function randomUUID(random?: () => number): string {
	const bytes = random ? undefined : crypto.getRandomValues(new Uint8Array(16));
	const hex = "0123456789abcdef";
	let uuid = "";
	for (let i = 0; i < 16; i++) {
		if (i === 4 || i === 6 || i === 8 || i === 10) {
			uuid += "-";
		}
		let byte = random ? Math.floor(random() * 256) : bytes![i]!;
		if (i === 6) {
			byte = (byte & 15) | 64;
		} else if (i === 8) {
			byte = (byte & 63) | 128;
		}
		uuid += hex[byte >>> 4]! + hex[byte & 15]!;
	}
	return uuid;
}

export async function getValuesFunction(
	name: Values,
	random?: () => number,
): Promise<ValueFunction> {
	switch (name) {
		case "random":
			return () => randomString(10, random);
		case "randomLonger":
			return () => randomString(32, random);
		case "randomUUID":
			return () => randomUUID(random);
		case "intToStr":
			return String;
		case "stringSumDos":
			return (i) => stringSumCollisions[i % stringSumCollisions.length]!;
		case "murmur3Collisions": {
			const { murmur3Collisions } = await import("./Murmur3Collisions");
			return (i) => murmur3Collisions[i % murmur3Collisions.length]!;
		}
		case "xxhash32Collisions": {
			const { xxhash32Collisions } = await import("./XxHash32Collisions");
			return (i) => xxhash32Collisions[i % xxhash32Collisions.length]!;
		}
		case "farmhash32Collisions": {
			const { farmhash32Collisions } = await import("./FarmHash32Collisions");
			return (i) => farmhash32Collisions[i % farmhash32Collisions.length]!;
		}
		case "wyhash32Collisions": {
			const { wyhash32Collisions } = await import("./WyHash32Collisions");
			return (i) => wyhash32Collisions[i % wyhash32Collisions.length]!;
		}
		case "fasthash32Collisions": {
			const { fasthash32Collisions } = await import("./FastHash32Collisions");
			return (i) => fasthash32Collisions[i % fasthash32Collisions.length]!;
		}
		case "commonWords": {
			const { commonWords } = await import("./CommonWords");
			return (i) => commonWords[i % commonWords.length]!;
		}
		case "randomIP":
		case "randomIpAddress":
			return () =>
				Array.from({ length: 4 }, () =>
					Math.floor((random ?? Math.random)() * 256),
				).join(".");
	}
}

/** Custom playground functions may return signed integers, but array indices cannot. */
export function bucketIndex(hash: number, buckets: number): number {
	if (!Number.isFinite(hash) || !Number.isInteger(hash)) {
		throw new TypeError("The hash function must return a finite integer.");
	}
	return ((hash % buckets) + buckets) % buckets;
}
