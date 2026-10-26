import {
	MASK_SCALE,
	GROUND_Y,
	SOIL_SPEED,
	SOIL_FADE_DURATION,
	SOIL_DELAY,
	SOIL_BOTTOM_FADE,
	SOIL_OPACITY,
	SOIL_MATERIAL,
	materials,
	createMask,
	createMasks,
	type BloomHeroRenderer,
	type BloomHeroGrid,
} from "./BloomHeroRenderer";

const vertexSource = `
attribute vec2 position;
void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

const cellSource = (materialOrder: readonly number[]) => `
precision highp float;
uniform sampler2D mask, palette;
uniform vec4 grid, soil;
uniform float elapsed;
const int sampleSide = ${MASK_SCALE};
const float sampleScale = float(sampleSide);

float grow(float value) {
	value = clamp(value, 0.0, 1.0);
	return value * value * (3.0 - 2.0 * value);
}

vec4 paintAt(vec2 uv, int material) {
	// Each material slice carries coverage in alpha and crease shading in RGB.
	return texture2D(mask, vec2(uv.x, (float(material) + uv.y) / ${materials.length}.0));
}

int materialAt(int index) {
${materialOrder.map((material, index) => `\tif (index == ${index}) return ${material};`).join("\n")}
	return 0;
}

void main() {
	vec2 historyUV = gl_FragCoord.xy / grid.xy;
	vec2 uv = vec2(historyUV.x, 1.0 - historyUV.y);
	vec2 cell = floor(uv * grid.xy);
	vec2 maskSize = grid.xy * sampleScale;
	float material = 0.0;
	for (int i = 0; i < ${materialOrder.length}; i++) {
		int candidate = materialAt(i);
		if (paintAt((cell + 0.5) / grid.xy, candidate).a > 0.0) {
			material = float(candidate);
		}
	}
	float strongestMaterial = 0.0;
	float strongestAlpha = 0.0;
	float sum = 0.0;
	float shadeSum = 0.0;
	float shadeWeight = 0.0;
	for (int row = 0; row < sampleSide; row++) {
		for (int column = 0; column < sampleSide; column++) {
			vec2 sampleUV = (cell * sampleScale + vec2(float(column) + 0.5, float(row) + 0.5)) / maskSize;
			float transparent = 1.0;
			float sampleMaterial = 0.0;
			float sampleShade = 1.0;
			for (int i = 0; i < ${materialOrder.length}; i++) {
				int candidate = materialAt(i);
				vec4 paint = paintAt(sampleUV, candidate);
				float amount = paint.a;
				transparent *= 1.0 - amount;
				if (amount > 0.0) {
					sampleMaterial = float(candidate);
					sampleShade = paint.r;
				}
			}
			float sampleAlpha = 1.0 - transparent;
			if (sampleAlpha > strongestAlpha) {
				strongestAlpha = sampleAlpha;
				strongestMaterial = sampleMaterial;
			}
			if (material == 0.0 || sampleMaterial == material) {
				shadeSum += sampleShade * sampleAlpha;
				shadeWeight += sampleAlpha;
			}
			sum += sampleAlpha;
		}
	}
	if (material == 0.0) material = strongestMaterial;
	float opacity = sum / (sampleScale * sampleScale);
	vec2 point = (cell + 0.5) * grid.zw;
	vec2 world = grid.xy * grid.zw;
	float fade = 1.0;
	if (point.y >= soil.x - grid.w) {
		float arrival = soil.w + abs(point.x - world.x * 0.5) / soil.y;
		fade = grow((elapsed - arrival) / soil.z)
			* (1.0 - ${SOIL_BOTTOM_FADE} * grow((point.y - soil.x) / (world.y - soil.x)));
	}
	float alpha = opacity * fade * (material == ${SOIL_MATERIAL}.0 ? ${SOIL_OPACITY} : 1.0);
	if (material < 0.5) alpha = 0.0;
	vec3 color = texture2D(palette, vec2((material + 0.5) / ${materials.length}.0, 0.5)).rgb;
	float shade = shadeWeight > 0.0 ? shadeSum / shadeWeight : 1.0;
	vec3 backdrop = texture2D(palette, vec2(0.5 / ${materials.length}.0, 0.5)).rgb;
	gl_FragColor = vec4(mix(backdrop, color, shade) * alpha, alpha);
}
`;

const glyphSource = `
precision highp float;
uniform sampler2D glyphs, cells;
uniform vec2 resolution, grid;
void main() {
	vec2 uv = vec2(gl_FragCoord.x / resolution.x, 1.0 - gl_FragCoord.y / resolution.y);
	vec2 cell = floor(uv * grid);
	// Uploaded canvases are top-down; framebuffer textures are bottom-up.
	vec2 historyUV = vec2(cell.x + 0.5, grid.y - cell.y - 0.5) / grid;
	gl_FragColor = texture2D(cells, historyUV) * texture2D(glyphs, uv).a;
}
`;

export class BloomHeroWebGL implements BloomHeroRenderer {
	readonly masks: readonly CanvasRenderingContext2D[];

	private readonly mask: CanvasRenderingContext2D;

	private readonly gl: WebGLRenderingContext;

	private readonly programs: (WebGLProgram | null)[];

	private readonly buffer: WebGLBuffer | null;

	private readonly textures: (WebGLTexture | null)[];

	private readonly framebuffer: WebGLFramebuffer | null;

	private readonly shaders: WebGLShader[] = [];

	private palette?: Uint8ClampedArray;

	private time: WebGLUniformLocation | null = null;

	private disposed = false;

	private constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly onContextLost: () => void,
		private readonly grid: BloomHeroGrid,
	) {
		this.masks = createMasks(grid, false);
		this.mask = createMask(grid, false);
		this.mask.canvas.height *= materials.length;
		const gl = canvas.getContext("webgl", {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
		});
		if (!gl) {
			throw new Error("WebGL unavailable");
		}
		this.gl = gl;
		this.programs = [gl.createProgram(), gl.createProgram()];
		this.buffer = gl.createBuffer();
		// Texture units: glyphs, mask, palette, then current cell colours.
		this.textures = Array.from({ length: 4 }, () => gl.createTexture());
		this.framebuffer = gl.createFramebuffer();
	}

	static async create(
		canvas: HTMLCanvasElement,
		onContextLost: () => void,
		grid: BloomHeroGrid,
		materialOrder: readonly number[],
		signal: AbortSignal,
	): Promise<BloomHeroWebGL> {
		const renderer = new BloomHeroWebGL(canvas, onContextLost, grid);
		await renderer.initialize(materialOrder, signal);
		return renderer;
	}

	private async initialize(
		materialOrder: readonly number[],
		signal: AbortSignal,
	): Promise<void> {
		const gl = this.gl;
		const { columns, rows, cellWidth, cellHeight } = this.grid;
		try {
			signal.throwIfAborted();
			signal.addEventListener("abort", () => this.dispose(), { once: true });
			if (
				(gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
					?.precision ?? 0) === 0
			) {
				throw new Error("Fragment precision unavailable");
			}
			const parallel = gl.getExtension("KHR_parallel_shader_compile");
			this.link(this.programs[0]!, cellSource(materialOrder));
			this.link(this.programs[1]!, glyphSource);
			if (parallel !== null) {
				while (
					!signal.aborted &&
					this.programs.some(
						(program) =>
							gl.getProgramParameter(
								program!,
								parallel.COMPLETION_STATUS_KHR,
							) !== true,
					)
				) {
					signal.throwIfAborted();
					if (gl.isContextLost()) {
						throw new Error("WebGL context lost during compilation");
					}
					// eslint-disable-next-line no-await-in-loop -- Poll background shader compilation without blocking rendering.
					await new Promise<void>((resolve) => {
						setTimeout(resolve, 0);
					});
				}
			}
			signal.throwIfAborted();
			for (const program of this.programs) {
				if (gl.getProgramParameter(program!, gl.LINK_STATUS) !== true) {
					throw new Error(
						gl.getProgramInfoLog(program!) ?? "Shader linking failed",
					);
				}
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
				gl.STATIC_DRAW,
			);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			for (let i = 0; i < this.textures.length; i += 1) {
				this.bind(i);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
			this.bind(3);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				columns,
				rows,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				this.textures[3]!,
				0,
			);
			if (
				gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
			) {
				throw new Error("Cell framebuffer incomplete");
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			const cellProgram = this.programs[0]!;
			gl.useProgram(cellProgram);
			gl.uniform1i(gl.getUniformLocation(cellProgram, "mask"), 1);
			gl.uniform1i(gl.getUniformLocation(cellProgram, "palette"), 2);
			// Grid packs columns/rows/cell width/cell height; soil packs ground/speed/fade/delay.
			gl.uniform4f(
				gl.getUniformLocation(cellProgram, "grid"),
				columns,
				rows,
				cellWidth,
				cellHeight,
			);
			gl.uniform4f(
				gl.getUniformLocation(cellProgram, "soil"),
				GROUND_Y,
				SOIL_SPEED,
				SOIL_FADE_DURATION,
				SOIL_DELAY,
			);
			this.time = gl.getUniformLocation(cellProgram, "elapsed");
			const glyphProgram = this.programs[1]!;
			gl.useProgram(glyphProgram);
			gl.uniform1i(gl.getUniformLocation(glyphProgram, "glyphs"), 0);
			gl.uniform1i(gl.getUniformLocation(glyphProgram, "cells"), 3);
			gl.uniform2f(gl.getUniformLocation(glyphProgram, "grid"), columns, rows);
			this.canvas.addEventListener("webglcontextlost", this.lost);
		} catch (error) {
			this.dispose();
			throw error;
		}
	}

	private link(program: WebGLProgram, source: string): void {
		const gl = this.gl;
		gl.attachShader(program, this.compile(gl.VERTEX_SHADER, vertexSource));
		gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, source));
		gl.bindAttribLocation(program, 0, "position");
		gl.linkProgram(program);
	}

	private compile(type: number, source: string): WebGLShader {
		const gl = this.gl;
		const shader = gl.createShader(type);
		if (!shader) {
			throw new Error("Shader unavailable");
		}
		this.shaders.push(shader);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		return shader;
	}

	private bind(unit: number, texture = unit): void {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[texture]!);
	}

	setGlyphs(glyphs: HTMLCanvasElement): void {
		const { width, height } = glyphs;
		const gl = this.gl;
		this.canvas.width = width;
		this.canvas.height = height;
		gl.useProgram(this.programs[1]!);
		gl.uniform2f(
			gl.getUniformLocation(this.programs[1]!, "resolution"),
			width,
			height,
		);
		this.bind(0);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphs);
		this.canvas.style.display = "block";
	}

	draw(palette: Uint8ClampedArray, elapsed: number): void {
		if (this.gl.isContextLost()) {
			return;
		}
		const gl = this.gl;
		const atlas = this.mask;
		atlas.clearRect(0, 0, atlas.canvas.width, atlas.canvas.height);
		for (const [material, mask] of this.masks.entries()) {
			atlas.drawImage(mask.canvas, 0, material * mask.canvas.height);
		}
		this.bind(1);
		// Upload coverage and shading without reading pixels back into JavaScript.
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			this.mask.canvas,
		);
		if (palette !== this.palette) {
			this.bind(2);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				materials.length,
				1,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				palette,
			);
			this.palette = palette;
		}
		gl.useProgram(this.programs[0]!);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, this.grid.columns, this.grid.rows);
		gl.uniform1f(this.time, elapsed);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.useProgram(this.programs[1]!);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.bind(3);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	private readonly lost = (): void => this.onContextLost();

	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.canvas.removeEventListener("webglcontextlost", this.lost);
		this.canvas.style.display = "none";
		for (const shader of this.shaders) {
			this.gl.deleteShader(shader);
		}
		for (const texture of this.textures) {
			this.gl.deleteTexture(texture);
		}
		this.gl.deleteFramebuffer(this.framebuffer);
		this.gl.deleteBuffer(this.buffer);
		for (const program of this.programs) {
			this.gl.deleteProgram(program);
		}
	}
}
