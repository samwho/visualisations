const MAX_CODE_BYTES = 1024 * 1024;
const TOO_LARGE = "Shared code exceeds the 1 MiB limit.";

/** Gzip UTF-8 source, then base64 it for a URLSearchParams value. */
export async function compressCode(code: string): Promise<string> {
	const bytes = new TextEncoder().encode(code);
	if (bytes.length > MAX_CODE_BYTES) {
		throw new Error(TOO_LARGE);
	}
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
	// Avoid spreading arbitrarily large byte arrays into a function call.
	return btoa(
		Array.from(compressed, (byte) => String.fromCodePoint(byte)).join(""),
	);
}

export async function decodeSharedCode(code: string): Promise<string> {
	// Gzip's 1f 8b 08 header is H4sI in base64. Invalid gzip must not fall back to source.
	if (code.startsWith("H4sI")) {
		return decompressCode(code);
	}
	// Older hashing and allocator links stored plain source.
	if (new TextEncoder().encode(code).length > MAX_CODE_BYTES) {
		throw new Error(TOO_LARGE);
	}
	return code;
}

export async function decompressCode(encoded: string): Promise<string> {
	if (encoded.length > Math.ceil((MAX_CODE_BYTES * 4) / 3) + 1024) {
		throw new Error(TOO_LARGE);
	}
	const bytes = Uint8Array.from(atob(encoded), (character) =>
		character.codePointAt(0)!,
	);
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			// oxlint-disable-next-line no-await-in-loop -- Stream reads are sequential so the output limit can stop decompression early.
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			size += value.length;
			// Bound decompressed output before materialising an externally supplied URL.
			if (size > MAX_CODE_BYTES) {
				// oxlint-disable-next-line no-await-in-loop -- Cancel delivery before releasing the reader on oversized input.
				await reader.cancel();
				throw new Error(TOO_LARGE);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const decoded = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		decoded.set(chunk, offset);
		offset += chunk.length;
	}
	return new TextDecoder("utf-8", { fatal: true }).decode(decoded);
}
