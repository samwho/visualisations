interface RepositoryData {
	description: string;
	language: string;
	stars: number;
	forks: number;
}

interface RepositoryCatalog {
	readonly [repo: string]: RepositoryData;
}

export const repositories: RepositoryCatalog = {
	"samwho/spacer": {
		description: "CLI tool to insert spacers when command output stops.",
		language: "Rust",
		stars: 1818,
		forks: 24,
	},
	"samwho/visualisations": {
		description: "Code behind my visualisation blog posts.",
		language: "TypeScript",
		stars: 375,
		forks: 11,
	},
	"samwho/hmm": {
		description:
			"A small command-line note taking app written in Rust. Notes are written in plain text and indexed by the time they were written.",
		language: "Rust",
		stars: 118,
		forks: 8,
	},
	"ngrok/webernetes": {
		description: "Kubernetes in the browser.",
		language: "TypeScript",
		stars: 1315,
		forks: 74,
	},
};
