import * as PIXI from './pixi-legacy.mjs';
import { Application, Graphics, Text } from './pixi-legacy.mjs';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);
gsap.globalTimeline.pause();

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
function annotateRange(address, size, color = null) {
    checkAddress(address);
    checkColor(color);
    checkSize(size);
    if (!size || size <= 0) {
        throw new Error(\`range must be greater than 0, got \${size}\`);
    }
    __annotations.push({ type: "range", address, size, color })
}
function annotateText(address, text, color = null) {
    checkAddress(address);
    checkColor(color);
    __annotations.push({ type: "text", address, text, color })
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

const ALLOCATOR_PREAMBLE_LINES = ALLOCATOR_PREAMBLE.split('\n').length;

function floatCmp(a, b) {
    if (Math.abs(a - b) < 0.001) {
        return 0;
    }
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
}

const THREAD_COLORS = [
    0xE69F00,
    0xDC267F,
    0x648FFF,
    0x785EF0,
    0xFE6100,
]

class AllocationAnimator {
    constructor({
        calls,
        memory,
        interval = 1,
        progress = 0,
        showAnnotations = true,
        debug = false
    }) {
        this.calls = calls;
        this.memory = memory;
        this.interval = interval;
        this.debug = debug;
        this.alternateColor = 0xDC267F;
        this.rangeAnnotation = {};
        this.textAnnotation = {};
        this.pointerAnnotation = {};
        this.showAnnotations = showAnnotations;
        this.times = [];

        this.tl = gsap.timeline({});
        this.tl.pause();

        let allocations = {}

        if (this.debug) {
            console.log("AllocationAnimator");
            console.log(this.calls);
        }

        for (let call of this.calls) {
            if (call.function === 'malloc') {
                allocations[call.return] = call.args[0];

                var bytes = this.memory.getBytes(call.return, call.args[0]);
                this.tl.to(bytes, {
                    pixi: {
                        tint: call.color,
                        alpha: 1,
                    },
                    duration: call.duration,
                    onComplete: () => {
                        if (this.debug) {
                            console.log(`[thread: ${call.threadId}] malloc(${call.args[0]}) = ${call.return}`);
                        }
                    },
                }, call.time);
                if (this.times.length === 0 || this.times[this.times.length - 1].time !== call.time) {
                    this.times.push(call);
                }
            } else if (call.function === 'free') {
                let address = call.args[0];
                let size = allocations[address];
                if (size === undefined) {
                    continue;
                }
                delete allocations[address];

                var bytes = this.memory.getBytes(address, size);
                this.tl.to(bytes, {
                    pixi: {
                        tint: THREAD_COLORS[0],
                        alpha: 0.3,
                    },
                    duration: call.duration,
                    onComplete: () => {
                        if (this.debug) {
                            console.log(`[thread: ${call.threadId}] free(${call.args[0]})`);
                        }
                    },
                }, call.time);
                if (this.times.length === 0 || this.times[this.times.length - 1].time !== call.time) {
                    this.times.push(call);
                }
            } else if (call.function === 'annotate' && this.showAnnotations) {
                if (call.type === "range") {
                    let bytes = this.memory.getBytes(call.address, call.size);
                    let entry = new RangeAnnotation({ bytes, color: call.color });
                    entry.alpha = 0;
                    this.rangeAnnotation[call.address] = entry;
                    this.memory.addChild(entry);
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 1,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] annotateRange(${call.address}, ${call.size}, ${call.color ? call.color.toString(16) : undefined})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "text") {
                    let bytes = this.memory.getBytes(call.address, 1);
                    let entry = new TextAnnotation({
                        byte: bytes[0], text: call.text, color: call.color
                    });
                    entry.alpha = 0;
                    this.textAnnotation[call.address] = entry;
                    this.memory.addChild(entry);
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 1,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] annotateText(${call.address}, ${call.text}, ${call.color ? call.color.toString(16) : undefined})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "pointer") {
                    let from = this.memory.getBytes(call.address, 1)[0];
                    let to = this.memory.getBytes(call.target, 1)[0];
                    let entry = new PointerAnnotation({
                        from, to, color: call.color
                    });
                    entry.alpha = 0;
                    this.pointerAnnotation[call.address] = entry;
                    this.memory.addChild(entry);
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 1,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] annotatePointer(${call.address}, ${call.target}, ${call.color ? call.color.toString(16) : undefined})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "color") {
                    let target = this.memory.getBytes(call.address, 1)[0];
                    this.tl.to(target, {
                        pixi: {
                            tint: call.color,
                            alpha: call.alpha || 1,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] annotateColor(${call.address}, ${call.color ? call.color.toString(16) : undefined})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "removeColor") {
                    let target = this.memory.getBytes(call.address, 1)[0];
                    this.tl.to(target, {
                        pixi: {
                            tint: THREAD_COLORS[0],
                            alpha: 0.3,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] removeColor(${call.address})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "removeRange") {
                    let entry = this.rangeAnnotation[call.address];
                    if (!entry) {
                        if (this.debug) {
                            console.warn(`[thread: ${call.threadId}] removeRange(${call.address}) failed: not found`);
                        }
                        continue;
                    }
                    delete this.rangeAnnotation[call.address];
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 0,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] removeRange(${call.address})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "removeText") {
                    let entry = this.textAnnotation[call.address];
                    if (!entry) {
                        if (this.debug) {
                            console.warn(`[thread: ${call.threadId}] removeText(${call.address}) failed: not found`);
                        }
                        continue;
                    }
                    delete this.textAnnotation[call.address];
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 0,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] removeText(${call.address})`);
                            }
                        },
                    }, call.time);
                } else if (call.type === "removePointer") {
                    let entry = this.pointerAnnotation[call.address];
                    if (!entry) {
                        if (this.debug) {
                            console.warn(`[thread: ${call.threadId}] removePointer(${call.address}) failed: not found`);
                        }
                        continue;
                    }
                    delete this.pointerAnnotation[call.address];
                    this.tl.to(entry, {
                        pixi: {
                            alpha: 0,
                        },
                        duration: call.duration,
                        onComplete: () => {
                            if (this.debug) {
                                console.log(`[thread: ${call.threadId}] removePointer(${call.address})`);
                            }
                        },
                    }, call.time);
                }
            }
        }

        this.tl.to({}, { duration: 0.1 });
        if (this.debug) {
            console.log("Timeline");
            console.log(this.tl);
        }

        // HACK: in order to make the annotations present at time 0 visible,
        // we need to advance the timeline past 0 first, and then rewind.
        this.progress = 0.1;
        this.progress = progress;
    }

    get progress() {
        return this.tl.time() / this.tl.totalDuration();
    }

    set progress(value) {
        // HACK: when you reverse a timeline, it will play the animations in
        // reverse order. This isn't actually what we want. If, for example,
        // you set and remove a byte colour at the same time, the byte colour
        // will differ depending on whether you're moving the playhead forward
        // or backward. We always want the state at a given time to be the same,
        // so we always make sure progress is considered to have moved forward
        // by including a small rewind first.
        if (value > 0) {
            this.tl.progress(value - 0.0001);
        }
        this.tl.progress(value);
    }

    get position() {
        if (this.times.length === 0) {
            return 0;
        }

        let time = this.tl.time();
        let position = this.times.findIndex(t => floatCmp(t.time, time) >= 0);
        if (floatCmp(time, this.times[0].time) === -1) {
            position = -1;
        }
        if (floatCmp(time, this.times[this.times.length - 1].time) === 1) {
            position = this.times.length;
        }
        return position;
    }

    set position(value) {
        if (value <= 0) {
            this.progress = 0;
        } else if (value >= this.times.length) {
            this.progress = 1;
        } else {
            this.progress = this.times[value].time / this.tl.totalDuration();
        }
    }

    get altPosition() {
        if (this.times.length === 0) {
            return 0;
        }

        let time = this.tl.time();
        let position = this.times.findIndex(t => floatCmp(t.time, time) > 0);
        if (position === -1) {
            position = this.times.length;
        }
        return position - 1;
    }

    next() {
        let position = this.position;
        if (position === this.times.length - 1) {
            this.progress = 1;
        } else if (position === this.times.length) {
            this.progress = 0;
        } else {
            this.progress = this.times[position + 1].time / this.tl.totalDuration();
        }
    }

    prev() {
        let position = this.position;
        if (position === 0) {
            this.progress = 0;
        } else if (position === -1) {
            this.progress = 1;
        } else {
            this.progress = this.times[position - 1].time / this.tl.totalDuration();
        }
    }
}

class OOM extends Error {
    constructor(message) {
        super(message);
        this.name = 'OutOfMemory';
    }
}

class Byte extends Graphics {
    constructor({ size, row, column }) {
        super();
        this.width = size;
        this.height = size;
        this.row = row;
        this.column = column;
        this.x = row * (size + 1);
        this.y = column * (size + 1);
        this.tint = THREAD_COLORS[0];
        this.alpha = 0.3;

        this.beginFill(0xFFFFFF);
        this.drawRoundedRect(0, 0, size, size, size / 4);
        this.endFill();
    }
}

class TextAnnotation extends Graphics {
    constructor({ text, byte, color = null, size = null, font = null }) {
        super();

        if (!color) {
            color = 0x434c5e;
        }
        if (!size) {
            size = byte.width / 2;
        }
        if (!font) {
            font = 'Fira Code';
        }

        this.text = new Text(text, {
            fill: color,
            fontFamily: font,
            fontSize: size,
            trim: true,
        });
        this.addChild(this.text);

        this.byte = byte;
        this.x = byte.x + byte.width / 2 - this.text.width / 2;
        this.y = byte.y + byte.height / 2 - this.text.height / 2;
    }
}

class RangeAnnotation extends Graphics {
    constructor({ bytes, color = null }) {
        super();
        this.bytes = bytes;
        this.color = color || 0x777777;
        this.fromByte = bytes[0];
        this.toByte = bytes[bytes.length - 1];
        this.x = 0;
        this.y = 0;
        this.beginFill(this.color);
        this.drawRoundedRect(
            this.fromByte.x + this.fromByte.width / 4,
            this.fromByte.y + this.fromByte.height / 4,
            this.fromByte._width / 2,
            this.fromByte._width / 2,
            this.fromByte._width / 8,
        );
        this.drawRoundedRect(
            this.toByte.x + this.toByte.width / 4,
            this.toByte.y + this.toByte.height / 4,
            this.toByte._width / 2,
            this.toByte._width / 2,
            this.toByte._width / 8,
        );
        this.endFill();

        this.moveTo(
            this.fromByte.x + this.fromByte.width / 2,
            this.fromByte.y + this.fromByte.height / 2
        );
        this.lineStyle(2, this.color);
        let prevY = this.fromByte.y;
        let prevX = this.fromByte.x;
        for (let byte of bytes) {
            if (byte.y !== prevY) {
                this.lineTo(
                    prevX + byte.width,
                    prevY + byte.height / 2
                );
                this.moveTo(
                    byte.x,
                    byte.y + byte.height / 2
                );
                this.lineTo(
                    byte.x + byte.width / 2,
                    byte.y + byte.height / 2
                );
            }
            this.lineTo(
                byte.x + byte.width / 2,
                byte.y + byte.height / 2
            );
            prevY = byte.y;
            prevX = byte.x;
        }
    }
}

class PointerAnnotation extends Graphics {
    constructor({ from, to, color = null }) {
        super();
        this.from = from;
        this.to = to;
        this.color = color || 0x777777;
        this.x = 0;
        this.y = 0;
        this.beginFill(this.color);
        this.drawCircle(
            this.from.x + this.from.width / 2,
            this.from.y + this.from.height / 2,
            this.from._width / 4,
        );
        this.endFill();

        let size = this.from._width / 4;
        let triangle = new Graphics();
        let vertexA = { x: -size / 2, y: size / 2 };
        let vertexB = { x: size / 2, y: size / 2 };
        let vertexC = { x: 0, y: -size / 2 };
        let rotation = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
        let toX = (this.to.x + this.to.width / 2) - ((size * 1.5) * Math.cos(rotation));
        let toY = this.to.y + this.to.height / 2 - ((size * 1.5) * Math.sin(rotation));

        triangle.beginFill(this.color);
        triangle.lineStyle(3, this.color, 1);
        triangle.moveTo(vertexA.x, vertexA.y);
        triangle.lineTo(vertexB.x, vertexB.y);
        triangle.lineTo(vertexC.x, vertexC.y);
        triangle.closePath();
        triangle.endFill();

        triangle.x = toX;
        triangle.y = toY;
        triangle.rotation = rotation + Math.PI / 2;
        this.addChild(triangle);

        this.lineStyle(2, this.color);
        this.moveTo(this.from.x + this.from.width / 2, this.from.y + this.from.height / 2);
        this.lineTo(toX, toY);
    }
}

class Memory extends Graphics {
    constructor({
        application,
        bytes = 1024,
        columns = 16,
    }) {
        super();
        this.bytes = bytes;
        this.grid = [];

        this.columns = columns;
        this.byteSize = application.screen.width / this.columns - 1;

        if (!this.bytes) {
            this.bytes = (parseInt(application.element.parentElement.clientHeight / (this.byteSize + 2)) - 1) * this.columns;
        }

        this.rows = this.bytes / this.columns;

        this._width = this.columns * (this.byteSize + 1) + 1;
        this._height = this.rows * (this.byteSize + 1) + 1;

        for (let x = 0; x < this.columns; x++) {
            let row = [];
            for (let y = 0; y < this.rows; y++) {
                let byte = new Byte({ size: this.byteSize, row: x, column: y });
                row.push(byte);
                this.addChild(byte);
            }
            this.grid.push(row);
        }
    }

    _addressToXY(address) {
        let x = address % this.grid.length;
        let y = Math.floor(address / this.grid.length);
        return { x, y };
    }

    getBytes(address, size) {
        let { x, y } = this._addressToXY(address);
        let bytes = [];
        for (let i = 0; i < size; i++) {
            if (this.grid[x][y] === undefined) {
                throw new OOM(`Attempted to access past end of memory: ${address} + ${size}`);
            }
            bytes.push(this.grid[x][y]);
            x++;
            if (x >= this.columns) {
                x = 0;
                y++;
            }
        }
        return bytes;
    }
}

class MemoryTracker {
    constructor(bytes) {
        this.memory = new Uint8Array(bytes);
        this.largestAddress = 0;
    }

    set(start, size) {
        for (let i = start; i < start + size; i++) {
            if (this.memory[i] === 1) {
                throw new Error(`Attempted to allocate memory at 0x${i.toString(16)} twice`);
            }
            this.memory[i] = 1;
            if (i > this.largestAddress) {
                this.largestAddress = i;
            }
        }
    }

    unset(start, size) {
        for (let i = start; i < start + size; i++) {
            if (this.memory[i] === 0) {
                throw new Error(`Attempted to free memory at 0x${i.toString(16)} twice`);
            }
            this.memory[i] = 0;
        }
    }
}

class Allocator {
    static fromString(code, opts) {
        let {
            setThread,
            malloc,
            free,
            getNewAnnotations,
            getNewLogs,
            o,
            info,
            warn,
            error,
        } = new Function(`
let opts = ${JSON.stringify(opts)};
${ALLOCATOR_PREAMBLE}
${code};
return {
    setThread,
    malloc,
    free,
    getNewAnnotations,
    getNewLogs,
    o: opts,
    info,
    warn,
    error,
};
        `)();

        return new Allocator({
            setThread,
            malloc,
            free,
            getNewAnnotations,
            getNewLogs,
            opts: o,
            info,
            warn,
            error,
        });
    }

    static async fromPath(path, opts) {
        const response = await fetch(path);
        const text = await response.text();
        return Allocator.fromString(text, opts);
    }

    constructor({
        setThread,
        malloc,
        free,
        getNewAnnotations,
        getNewLogs,
        opts,
        info,
        warn,
        error
    }) {
        this.setThread = setThread;
        this.malloc = malloc;
        this.free = free;
        this.getNewAnnotations = getNewAnnotations;
        this.getNewLogs = getNewLogs;
        this.opts = opts;
        this.info = info;
        this.warn = warn;
        this.error = error;
        this.logs = [];
        this.newCalls = [];
    }

    malloc(size) {
        if (this.malloc === null) {
            throw new Error("Not implemented");
        }
        return this.malloc(size);
    }

    free(address) {
        if (this.free === null) {
            throw new Error("Not implemented");
        }
        this.free(address);
    }

    time(calls) {
        let ops = 0;

        let start = performance.now();
        try {
            for (let call of calls) {
                if (call.function === 'malloc') {
                    this.malloc(call.args[0]);
                    ops += 1;
                } else if (call.function === 'free') {
                    this.free(call.args[0]);
                    ops += 1;
                }
            }
        } finally {
            let end = performance.now();
            let totalTime = end - start;
            this.ops = ops;
            this.totalTime = totalTime;
        }
    }

    run(calls) {
        let allocations = {};
        this.newCalls = [];
        let tracker = new MemoryTracker(this.opts.bytes);

        let startingAnnotations = this.getNewAnnotations();
        for (let annotation of startingAnnotations) {
            this.newCalls.push({
                function: 'annotate',
                type: annotation.type,
                address: annotation.address,
                target: annotation.target,
                text: annotation.text,
                alpha: annotation.alpha,
                size: annotation.size,
                color: annotation.color,
                time: 0,
                duration: 0,
                threadId: 0,
            });
        }

        try {
            for (let call of calls) {
                this.setThread(call.threadId);

                if (call.function === 'malloc') {
                    let address = this.malloc(call.args[0]);
                    this.info(`malloc(${call.args[0]}) = 0x${address.toString(16)}`);

                    if (address === -1) {
                        this.error(`malloc(${call.args[0]}) returned -1`);
                        throw new OOM(`malloc(${call.args[0]})`);
                    }
                    if (address < 0) {
                        this.error(`malloc(${call.args[0]}) returned ${address}`);
                        throw new Error(`Returned a negative address: malloc(${call.args[0]}) = ${address}`);
                    }
                    if (address + call.args[0] > this.opts.bytes) {
                        this.error(`malloc(${call.args[0]}) returned ${address} which puts the allocation past the end of memory`);
                        throw new OOM(`malloc(${call.args[0]})`);
                    }
                    if (call.id === undefined) {
                        call.id = address;
                    }
                    tracker.set(address, call.args[0]);
                    allocations[call.id] = { address, size: call.args[0] };
                    this.newCalls.push({ ...call, return: address });
                } else if (call.function === 'free') {
                    let id = call.id || call.args[0];
                    let { address, size } = allocations[id];
                    delete allocations[id];
                    tracker.unset(address, size);
                    this.free(address);
                    this.info(`free(0x${address.toString(16)})`);
                    this.newCalls.push({ ...call, args: [address] });
                }

                let annotations = this.getNewAnnotations();
                for (let annotation of annotations) {
                    this.newCalls.push({
                        function: 'annotate',
                        type: annotation.type,
                        address: annotation.address,
                        target: annotation.target,
                        alpha: annotation.alpha,
                        size: annotation.size,
                        text: annotation.text,
                        color: annotation.color,
                        time: call.time,
                        duration: call.duration,
                        threadId: call.threadId,
                    });
                }
            }
        } catch (e) {
            throw e;
        } finally {
            this.logs = this.getNewLogs();
            this.peakMemory = tracker.largestAddress;
            this.mallocsPerMs = parseInt(this.totalMallocs / (this.totalMallocTime));
            this.freesPerMs = parseInt(this.totalFrees / (this.totalFreeTime));
        }
        return this.newCalls;
    }
}

class ElementParser {
    constructor({ element, interval = 1, debug = false }) {
        this.element = element;
        this.interval = interval;
        this.debug = debug;
    }

    parse() {
        this.threadTime = {};
        this.calls = [];
        this.threadId = 0;
        this._parseElement(this.element, this._newThreadId());
        this.calls.sort((a, b) => a.time - b.time || a.threadId - b.threadId);
        return this.calls;
    }

    _newThreadId() {
        let id = this.threadId;
        this.threadId += 1;
        return id;
    }

    _parseElement(element, threadId) {
        for (let child of element.children) {
            if (this.threadTime[threadId] === undefined) {
                this.threadTime[threadId] = 0.1;
            }

            let duration = parseFloat(child.getAttribute('duration'));
            if (isNaN(duration)) {
                duration = this.interval;
            }

            if (child.tagName === "THREAD") {
                this._parseElement(child, this._newThreadId());
                continue;
            } else if (child.tagName === 'MALLOC') {
                let id = child.getAttribute('id');
                if (id) {
                    id = `${threadId}-${id}`;
                }

                this.calls.push({
                    function: "malloc",
                    id,
                    args: [parseInt(child.getAttribute('size'))],
                    return: parseInt(child.getAttribute('addr')),
                    threadId: threadId,
                    color: child.getAttribute('color') || THREAD_COLORS[threadId % THREAD_COLORS.length],
                    time: this.threadTime[threadId],
                    duration: 0,
                });
                this.threadTime[threadId] += duration;
            } else if (child.tagName === 'FREE') {
                let id = child.getAttribute('id');
                if (id) {
                    id = `${threadId}-${id}`;
                }

                this.calls.push({
                    function: "free",
                    id,
                    args: [parseInt(child.getAttribute('addr'))],
                    return: null,
                    threadId: threadId,
                    time: this.threadTime[threadId],
                    duration: 0,
                });
                this.threadTime[threadId] += duration;
            } else if (child.tagName === 'SLEEP') {
                this.calls.push({
                    function: "sleep",
                    args: [parseInt(child.getAttribute('duration'))],
                    return: null,
                    threadId: threadId,
                    time: this.threadTime[threadId],
                    duration: 0,
                });
                this.threadTime[threadId] += duration;
            } else if (child.tagName === "ANNOTATE") {
                this.calls.push({
                    function: "annotate",
                    type: child.getAttribute('type'),
                    address: parseInt(child.getAttribute('addr')),
                    target: parseInt(child.getAttribute('target')),
                    alpha: parseFloat(child.getAttribute('alpha')),
                    size: parseInt(child.getAttribute('size')),
                    text: child.getAttribute('text'),
                    color: child.getAttribute('color'),
                    threadId: threadId,
                    time: this.threadTime[threadId],
                    duration: 0,
                });
            }

        }

        if (this.debug) {
            console.log(this.calls);
        }
    }

}

class Simulation extends Application {
    constructor({ element, id, allocatorCode = null, calls = null }) {
        super({
            backgroundAlpha: 0,
            resizeTo: element,
            antialias: true,
            autoDensity: true,
            autoStart: false,
            resolution: window.devicePixelRatio,
            forceCanvas: true,
        });
        this.element = element;
        this.id = id;
        this.allocatorCode = allocatorCode;
        this.calls = calls;
    };

    async init() {
        this.renderer.plugins.interaction.autoPreventDefault = false;
        this.renderer.view.style.touchAction = 'auto';

        this.interval = parseFloat(this.element.getAttribute('interval'));
        if (isNaN(this.interval)) {
            this.interval = 1;
        }
        this.bytes = this.element.getAttribute('bytes');
        if (this.bytes) {
            this.bytes = parseInt(this.bytes);
        }
        this.columns = this.element.getAttribute('columns');
        if (this.columns) {
            this.columns = parseInt(this.columns);
        }
        this.center = this.element.getAttribute('center') === 'false' ? false : true;
        this.debug = this.element.getAttribute('debug') === 'true';
        this.slider = this.element.getAttribute('slider') === 'false' ? false : true;
        this.annotations = this.element.getAttribute('annotations') === 'false' ? false : true;

        if (!this.calls) {
            this.calls = new ElementParser({
                element: this.element,
                interval: this.interval,
                debug: this.debug,
            }).parse()
        }

        this.memory = new Memory({
            application: this,
            bytes: this.bytes,
            columns: this.columns || 16,
        });

        if (this.allocatorCode) {
            this.allocator = Allocator.fromString(this.allocatorCode, {
                bytes: this.memory.bytes,
                debug: this.debug,
            });
        } else {
            this.allocator = null;
            let allocatorElem = this.element.querySelector('allocator');
            if (allocatorElem) {
                let opts = { bytes: this.memory.bytes, debug: this.debug };
                let optionsElem = allocatorElem.querySelector('options');
                if (optionsElem) {
                    for (let attr of optionsElem.attributes) {
                        opts[attr.name] = attr.value;
                    }
                }
                this.allocator = await Allocator.fromPath(
                    allocatorElem.getAttribute('path'),
                    opts
                );
            }
        }

        this.element.innerHTML = '';

        this.element.style.display = 'flex';
        this.element.style.justifyContent = 'flex-start';
        this.element.style.alignItems = 'center';
        this.element.style.flexDirection = 'column';

        this.element.appendChild(this.view);

        if (this.center) {
            this.memory.x = this.screen.width / 2 - this.memory.width / 2;
        }

        this.memory.y = 0;
        this.stage.addChild(this.memory);

        if (this.allocator) {
            this.calls = this.allocator.run(this.calls);
        }
        this.player = new AllocationAnimator({
            calls: this.calls,
            memory: this.memory,
            interval: this.interval,
            progress: this.slider ? 0 : 1,
            showAnnotations: this.annotations,
            debug: this.debug,
        });

        if (this.slider) {
            this.element.style.marginBottom = "3rem";

            let topContainer = document.createElement('div');
            topContainer.style.width = `${this.memory.width}px`;
            topContainer.style.minHeight = "2rem";
            topContainer.style.display = 'flex';
            topContainer.style.justifyContent = "center";
            topContainer.style.flexDirection = 'row';
            topContainer.style.marginTop = this.element.style.marginTop;
            this.element.style.marginTop = "0";
            this.element.parentElement.insertBefore(topContainer, this.element);

            this.textPrev = document.createElement('div');
            this.textPrev.style.fontSize = "1rem";
            this.textPrev.style.fontFamily = "Fira Code, monospace";
            this.textPrev.style.textAlign = "left";
            this.textPrev.style.minWidth = "7rem";
            this.textPrev.style.opacity = "0.3";

            this.text = document.createElement('div');
            this.text.style.fontSize = "1rem";
            this.text.style.fontFamily = "Fira Code, monospace";
            this.text.style.fontWeight = "bold";
            this.text.style.textAlign = "center";
            this.text.style.minWidth = "7rem";

            this.textNext = document.createElement('div');
            this.textNext.style.fontSize = "1rem";
            this.textNext.style.fontFamily = "Fira Code, monospace";
            this.textNext.style.minWidth = "7rem";
            this.textNext.style.textAlign = "right";
            this.textNext.style.opacity = "0.3";

            topContainer.appendChild(this.textPrev);
            topContainer.appendChild(this.text);
            topContainer.appendChild(this.textNext);

            let datalist = document.createElement('datalist');
            datalist.id = `ticks-${this.id}`;
            for (let tick of this.player.times) {
                let option = document.createElement('option');
                option.value = tick.time / this.player.tl.totalDuration();
                datalist.appendChild(option);
            }
            this.element.appendChild(datalist);

            let bottomContainer = document.createElement('div');
            bottomContainer.style.width = `${this.memory.width}px`;
            bottomContainer.style.minHeight = "2rem";
            bottomContainer.style.display = 'flex';
            bottomContainer.style.justifyContent = "center";
            bottomContainer.style.alignItems = "center";
            bottomContainer.style.flexDirection = 'row';


            this.slider = document.createElement('input');
            this.slider.setAttribute("list", datalist.id);
            this.slider.type = 'range';
            this.slider.min = 0;
            this.slider.max = 1;
            this.slider.step = "any";
            this.slider.value = 0;
            this.slider.style.width = `${this.memory.width}px`;

            let prevButton = document.createElement('div');
            let nextButton = document.createElement('div');

            prevButton.innerHTML = "⬅️";
            prevButton.style.marginRight = "0.5rem";
            prevButton.style.cursor = "pointer";

            nextButton.innerHTML = "➡️";
            nextButton.style.marginLeft = "0.5rem";
            nextButton.style.cursor = "pointer";

            bottomContainer.appendChild(prevButton);
            bottomContainer.appendChild(this.slider);
            bottomContainer.appendChild(nextButton);


            this.element.appendChild(bottomContainer);

            this.element.addEventListener('click', () => {
                this.slider.focus();
            });

            let position = this.player.position;
            let altPosition = this.player.altPosition;

            this.slider.addEventListener('input', (e) => {
                this.player.progress = this.slider.value;
                let newAltPosition = this.player.altPosition;
                if (newAltPosition !== altPosition) {
                    altPosition = newAltPosition;
                    this.updateText(this.textPrev, altPosition - 1);
                    this.updateText(this.text, altPosition);
                    this.updateText(this.textNext, altPosition + 1);
                    this.ticker.update();
                }
            });

            this.slider.addEventListener('keydown', (e) => {
                e.preventDefault();

                let isLeft = e.key === 'ArrowLeft' || e.key === "ArrowUp" || e.key === 'h';
                let isRight = e.key === 'ArrowRight' || e.key === "ArrowDown" || e.key === 'l';

                if (isLeft) {
                    this.player.prev();
                } else if (isRight) {
                    this.player.next();
                }

                this.updateState();
            });

            prevButton.addEventListener('click', () => {
                this.player.prev();
                this.updateState();
            });

            nextButton.addEventListener('click', () => {
                this.player.next();
                this.updateState();
            });


            this.updateText(this.text, position);
            this.updateText(this.textNext, position + 1);
        }

        this.element.style.height = `${this.memory.height}px`;
        this.renderer.resize(this.element.clientWidth, this.element.clientHeight);

        this.ticker.update();
    }

    updateState() {
        this.slider.value = this.player.progress;

        let position = this.player.position;
        this.updateText(this.textPrev, position - 1);
        this.updateText(this.text, position);
        this.updateText(this.textNext, position + 1);
        this.ticker.update();
    }

    updateText(text, position) {
        if (position < 0) {
            text.innerHTML = "";
            return;
        }
        if (position >= this.player.times.length) {
            text.innerHTML = "";
            return;
        }

        let call = this.player.times[position];
        if (call.function === "malloc") {
            text.style.color = "#009E73";
            text.innerHTML = `malloc(${call.args[0]})`;
        }
        if (call.function === "free") {
            text.style.color = "#D55E00";
            text.innerHTML = `free(0x${call.args[0].toString(16)})`;
        }
    }
}

let simulations = {};

document.addEventListener('DOMContentLoaded', async () => {
    let id = 0;
    for (let element of document.querySelectorAll('.memory')) {
        let simulation = new Simulation({ element, id });
        simulation.init();
        if (element.id) {
            simulations[element.id] = simulation;
        }
        id += 1;
    }

    for (let a of document.querySelectorAll('a[simulation]')) {
        a.addEventListener('click', (e) => {
            let id = a.getAttribute('simulation');
            let element = document.getElementById(id);
            let simulation = simulations[id];
            simulation.player.position = parseInt(a.getAttribute('position'));
            simulation.updateState();
            window.scrollTo({ top: element.offsetTop - 100, behavior: 'smooth' });
        });
    }

    let hexadecimalSlider = document.getElementById("hexadecimal-slider");
    if (hexadecimalSlider) {
        let hexadecimal = document.getElementById("hexadecimal");
        let decimal = document.getElementById("decimal");
        hexadecimalSlider.addEventListener('input', () => {
            let value = parseInt(hexadecimalSlider.value);
            hexadecimal.innerText = "0x" + value.toString(16);
            decimal.innerText = value.toString(10);
        });
    }
});

export { Simulation, ElementParser, Allocator, ALLOCATOR_PREAMBLE_LINES };
