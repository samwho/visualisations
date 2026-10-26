import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const posts = Array.from(
	new Bun.Glob("src/posts/*/index.ts").scanSync({ cwd: root }),
).map((path) => path.split("/")[2]!);
const selected = Bun.argv.slice(2);
for (const post of selected) {
	if (!posts.includes(post)) {
		throw new Error(`Unknown post: ${post}. Choose from ${posts.join(", ")}`);
	}
}

async function buildPost(post: string): Promise<void> {
	const source = resolve(root, "src/posts", post);
	const output = resolve(root, "out", post);
	const entrypoints = Array.from(
		new Bun.Glob("{index.ts,playground.ts,*worker.ts}").scanSync({
			cwd: source,
			absolute: true,
		}),
	).sort();
	const result = await Bun.build({
		entrypoints,
		root: source,
		target: "browser",
		outdir: output,
		sourcemap: "linked",
		// Only Hashing's workers are all module workers.
		splitting: post === "hashing",
		loader: { ".svg": "text" },
		define: {
			global: "globalThis",
			"process.env.NODE_ENV": JSON.stringify("production"),
		},
	});
	if (!result.success) {
		throw new AggregateError(result.logs, `Build failed: ${post}`);
	}
	const assets = await Promise.all(
		result.outputs.map(async (asset) => ({
			path: asset.path,
			contents: new Uint8Array(await asset.arrayBuffer()),
		})),
	);
	await rm(output, { recursive: true, force: true });
	await Promise.all(
		assets.map((asset) => Bun.write(asset.path, asset.contents)),
	);
	console.log(`Built ${post}`);
}

for (const post of selected.length > 0 ? selected : posts.sort()) {
	// eslint-disable-next-line eslint/no-await-in-loop -- Bound peak memory while bundling independent posts.
	await buildPost(post);
}
