// hash.js 1.1.7 ships without declarations. Describe the API used by the post.
declare module "hash.js" {
	interface Digest {
		update(value: Uint8Array): this;
		digest(): number[];
	}
	export function sha1(): Digest;
	export function sha256(): Digest;
	export function sha512(): Digest;
}
