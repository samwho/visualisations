import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { repositories } from "../RepositoryData";
import "./Card";
import star from "../../../static/images/icons/framework7/star.svg";
import fork from "../../../static/images/icons/framework7/arrow_branch.svg";

const countFormatter = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

@customElement("s-repository-card")
export class RepositoryCard extends LitElement {
	@property()
	repo = "";

	static override styles = css`
		:host {
			display: grid;
			min-inline-size: 0;
			font: var(--type-caption-size)/var(--line-height-normal)
				var(--font-family-body);
		}

		a {
			display: grid;
			color: var(--color-text-primary);
			text-decoration: none;
		}

		.content {
			display: grid;
			grid-template-rows: auto 1fr auto;
			gap: var(--space-3);
			padding: var(--space-5);
		}

		a:visited {
			color: var(--color-text-primary);
		}

		a:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}

		h3 {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			margin: 0;
			font-size: 1.125rem;
			line-height: var(--line-height-tight);
			color: var(--color-palette-blue-foreground);
		}

		p {
			margin: 0;
		}

		.meta {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: var(--space-4);
			color: var(--color-text-secondary);
			font-variant-numeric: tabular-nums;
		}

		.meta > span {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
		}

		.icon {
			flex: none;
			color: var(--color-text-secondary);
		}

		.github-icon {
			inline-size: 1rem;
			block-size: 1rem;
			background: currentColor;
			mask: url("/images/github.svg") center / contain no-repeat;
		}

		.icon svg {
			display: block;
			inline-size: 1rem;
			block-size: 1rem;
			fill: currentColor;
		}

		.visually-hidden {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		.language {
			inline-size: 0.75rem;
			block-size: 0.75rem;
			border-radius: 50%;
			background: var(--color-data-neutral);
		}

		.language-rust {
			background: var(--color-data-fill-orange);
		}

		.language-typescript {
			background: var(--color-data-fill-blue);
		}
	`;

	private get repositoryPath(): string {
		return this.repo.split("/").map(encodeURIComponent).join("/");
	}

	private renderCount(label: string, icon: string, count?: number) {
		return html`
			<span title=${count === undefined ? nothing : count.toLocaleString("en")}>
				<span
					class="icon"
					aria-hidden="true"
					>${unsafeSVG(icon)}</span
				>
				<span class="visually-hidden">${label}: ${count ?? "Unavailable"}</span>
				<span aria-hidden="true"
					>${count === undefined ? "—" : countFormatter.format(count)}</span
				>
			</span>
		`;
	}

	protected override render() {
		const stats = repositories[this.repo];
		const language = stats?.language ?? "—";
		const description = stats?.description ?? "View this repository on GitHub.";
		return html`
			<a href=${`https://github.com/${this.repositoryPath}`}>
				<s-card
					full-width
					stretch
				>
					<div class="content">
						<h3>
							<span
								class="icon github-icon"
								aria-hidden="true"
							></span>
							${this.repo.split("/").at(-1)}
						</h3>
						<p>${description}</p>
						<div class="meta">
							<span
								><span
									class=${`language language-${language.toLowerCase()}`}
									aria-hidden="true"
								></span
								>${language}</span
							>
							${this.renderCount("Stars", star, stats?.stars)}
							${this.renderCount("Forks", fork, stats?.forks)}
						</div>
					</div>
				</s-card>
			</a>
		`;
	}
}
