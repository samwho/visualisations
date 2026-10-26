import xxhash32 from "../examples/xxhash32.js.txt";
import farmhash32 from "../examples/farmhash32.js.txt";
import wyhash32 from "../examples/wyhash32.js.txt";
import fasthash32 from "../examples/fasthash32.js.txt";
import { murmur3 } from "./Hashers";
import { customHash } from "./CustomHash";

async function loadPort(source: string) {
	// Only bundled, authored ports reach this loader, never reader-supplied code.
	// Import the same sources the playground shows rather than maintaining copies.
	const url = URL.createObjectURL(
		new Blob([source], { type: "text/javascript" }),
	);
	try {
		return customHash(await import(url));
	} finally {
		URL.revokeObjectURL(url);
	}
}

const ports = await Promise.all(
	[xxhash32, farmhash32, wyhash32, fasthash32].map(loadPort),
);

export const realWorldHashers = {
	murmur3,
	xxhash32: ports[0]!,
	farmhash32: ports[1]!,
	wyhash32: ports[2]!,
	fasthash32: ports[3]!,
};
