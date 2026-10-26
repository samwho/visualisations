import { Queue } from "./Queue";
import type { Request } from "./Request";

export interface Point {
	x: number;
	y: number;
}

export interface SimulationGeometry {
	width: number;
	height: number;
	loadBalancer: Point;
	servers: Map<number, Point>;
	queues: Map<number, Point>;
}

interface SceneElements {
	stage: HTMLElement;
	loadBalancer: HTMLElement;
	requestLayer: HTMLElement;
	stateSummary: Text;
}

/** Indexes the simulation's structural DOM and caches its stable geometry. */
export class SimulationScene {
	readonly requests = new Map<number, Request>();

	readonly droppedRequests = new Map<number, Request>();

	private elements?: SceneElements;

	private readonly serverAnchors = new Map<number, HTMLElement>();

	private readonly serverQueues = new Map<number, Queue>();

	private readonly serverLabels = new Map<number, HTMLElement>();

	private cachedGeometry?: SimulationGeometry;

	get isIndexed(): boolean {
		return this.elements !== undefined;
	}

	get requestLayer(): HTMLElement | undefined {
		return this.elements?.requestLayer;
	}

	index(root: ParentNode): void {
		const stage = root.querySelector<HTMLElement>(".stage");
		const loadBalancer = root.querySelector<HTMLElement>(".load-balancer");
		const requestLayer = root.querySelector<HTMLElement>(".request-layer");
		const stateSummary = root.querySelector("#simulation-state")?.firstChild;
		if (
			!stage ||
			!loadBalancer ||
			!requestLayer ||
			!(stateSummary instanceof Text)
		) {
			this.elements = undefined;
			return;
		}

		this.elements = { stage, loadBalancer, requestLayer, stateSummary };
		this.serverAnchors.clear();
		this.serverQueues.clear();
		this.serverLabels.clear();
		for (const element of root.querySelectorAll<HTMLElement>(
			"[data-server-id]",
		)) {
			const serverId = Number(element.dataset.serverId);
			if (!Number.isFinite(serverId)) {
				continue;
			}
			if (element.classList.contains("server-anchor")) {
				this.serverAnchors.set(serverId, element);
			} else if (element.classList.contains("server-label")) {
				this.serverLabels.set(serverId, element);
			} else if (element instanceof Queue) {
				this.serverQueues.set(serverId, element);
			}
		}
		this.invalidateGeometry();
	}

	clear(): void {
		this.elements = undefined;
		this.serverAnchors.clear();
		this.serverQueues.clear();
		this.serverLabels.clear();
		this.requests.clear();
		this.droppedRequests.clear();
		this.invalidateGeometry();
	}

	invalidateGeometry(): void {
		this.cachedGeometry = undefined;
	}

	serverAnchor(serverId: number): HTMLElement | undefined {
		return this.serverAnchors.get(serverId);
	}

	queue(serverId: number): Queue | undefined {
		return this.serverQueues.get(serverId);
	}

	serverLabel(serverId: number): HTMLElement | undefined {
		return this.serverLabels.get(serverId);
	}

	setStateSummary(summary: string): void {
		const text = this.elements?.stateSummary;
		if (text && text.data !== summary) {
			text.data = summary;
		}
	}

	geometry(): SimulationGeometry | undefined {
		if (this.cachedGeometry) {
			return this.cachedGeometry;
		}
		const elements = this.elements;
		if (!elements) {
			return undefined;
		}

		const stageRect = elements.stage.getBoundingClientRect();
		const relativeCenter = (element: HTMLElement): Point => {
			const rect = element.getBoundingClientRect();
			return {
				x: rect.left - stageRect.left + rect.width / 2,
				y: rect.top - stageRect.top + rect.height / 2,
			};
		};

		const servers = new Map<number, Point>();
		for (const [serverId, anchor] of this.serverAnchors) {
			servers.set(serverId, relativeCenter(anchor));
		}
		const queues = new Map<number, Point>();
		for (const [serverId, queue] of this.serverQueues) {
			const rect = queue.getBoundingClientRect();
			queues.set(serverId, {
				x: rect.left - stageRect.left + rect.width / 2,
				y: rect.bottom - stageRect.top - 4,
			});
		}

		this.cachedGeometry = {
			width: stageRect.width,
			height: stageRect.height,
			loadBalancer: relativeCenter(elements.loadBalancer),
			servers,
			queues,
		};
		return this.cachedGeometry;
	}
}
