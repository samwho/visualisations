const ALLOCATOR_PREAMBLE = `
let window = undefined;
let document = undefined;
let fetch = undefined;

function getTotalMemory() {
    return opts.bytes;
}

let threadId = 0;
function setThread(thread) {
    threadId = thread;
}
function getThreadId() {
    return threadId;
}

function checkAddress(address, param = "address") {
    if (!Number.isInteger(address)) {
        throw new Error(\`invalid \${param} 0x\${address.toString(16)}, must be an integer\`);
    }
    if (address < 0 || address >= opts.bytes) {
        throw new Error(\`invalid \${param} 0x\${address.toString(16)}, must be between 0 and 0x\${(opts.bytes-1).toString(16)}\`);
    }
}
function checkColor(color) {
    if (color === null) {
        return;
    }
    if (!Number.isInteger(color)) {
        throw new Error(\`invalid color \${color}, must be an integer\`);
    }
    if (color < 0 || color > 0xffffff) {
        throw new Error(\`invalid color \${color.toString(16)}, must be integer value between 0x0 and 0xffffff\`);
    }
}
function checkSize(size) {
    if (!Number.isInteger(size)) {
        throw new Error(\`invalid size \${size}, must be an integer\`);
    }
    if (size <= 0) {
        throw new Error(\`invalid size \${size}, must be greater than 0\`);
    }
    if (size > opts.bytes) {
        throw new Error(\`invalid size \${size}, must be less than or equal to \${opts.bytes}\`);
    }
}

let __annotations = [];
function annotateRange(address, size, color = null, role = undefined) {
    checkAddress(address);
    checkColor(color);
    checkSize(size);
    if (!size || size <= 0) {
        throw new Error(\`range must be greater than 0, got \${size}\`);
    }
    __annotations.push({ type: "range", address, size, color, role })
}
function annotateText(address, text, color = null, metadataKind = undefined) {
    checkAddress(address);
    checkColor(color);
    __annotations.push({ type: "text", address, text, color, metadataKind })
}
function annotatePointer(address, target, color = null) {
    checkAddress(address);
    checkAddress(target, "target");
    checkColor(color);
    __annotations.push({ type: "pointer", address, target, color })
}
function annotateColor(address, color = null, alpha = null) {
    checkAddress(address);
    checkColor(color);
    if (alpha < 0 || alpha > 1) {
        throw new Error(\`alpha must be a value between 0 and 1, found \${alpha}\`);
    }
    __annotations.push({ type: "color", address, color, alpha })
}
function removeRange(address) {
    checkAddress(address);
    __annotations.push({ type: "removeRange", address })
}
function removeText(address) {
    checkAddress(address);
    __annotations.push({ type: "removeText", address })
}
function removePointer(address) {
    checkAddress(address);
    __annotations.push({ type: "removePointer", address })
}
function removeColor(address) {
    checkAddress(address);
    __annotations.push({ type: "removeColor", address })
}
function getNewAnnotations() {
    let ret = __annotations.slice();
    __annotations = [];
    return ret;
}

let __logs = [];
function log(level, message) {
    __logs.push({ level, message });
}

function info(message) {
    log("info", message);
}
function warn(message) {
    log("warn", message);
}
function error(message) {
    log("error", message);
}

function getNewLogs() {
    let ret = __logs.slice();
    __logs = [];
    return ret;
}

function debug(...args) {
    if (opts.debug) {
        console.log(...args);
    }
}
`;

export const ALLOCATOR_PREAMBLE_LINES = ALLOCATOR_PREAMBLE.split("\n").length;

/**
 * Runs allocator source with the playground's convenience API, not a security
 * sandbox. Source retains the privileges of the page or worker executing it.
 * @param {string} code
 * @param {import("./AllocatorRuntime").AllocatorOptions} options
 * @returns {import("./AllocatorRuntime").AllocatorRuntime}
 */
export function createAllocatorRuntime(code, options) {
	const create =
		/** @type {() => import("./AllocatorRuntime").AllocatorRuntime} */ (
			// oxlint-disable-next-line typescript/no-implied-eval -- The playground intentionally executes reader-supplied allocators.
			new Function(`
let opts = ${JSON.stringify(options)};
${ALLOCATOR_PREAMBLE}
${code};
return { setThread, malloc, free, getNewAnnotations, getNewLogs, options: opts, info, warn, error };
	`)
		);
	return create();
}
