let totalMemory = Math.min(256, getTotalMemory());
let memory = new Uint8Array(totalMemory);
let metadataColor = 0xcccccc;
let SIZE_COLOR = 0x0072B2;
let FREE_COLOR = 0x009E73
let ALLOCATED_COLOR = 0xD55E00;
const FREE = 1;
const ALLOCATED = 2;

function setMetadata(address, value = null, color = null) {
    if (value !== null) {
        memory[address] = value;
        if (color === SIZE_COLOR || color === FREE_COLOR || color === ALLOCATED_COLOR) {
            annotateText(address, value, 0xFFFFFF);
        } else {
            annotateText(address, value);
        }
    }
    annotateColor(address, color || metadataColor);
}

function clearMetadata(address) {
    removeColor(address);
    removeText(address);
}

function markFree(address) {
    let size = sizeOf(address);
    clearMetadata(address);
    clearMetadata(address + 1);
    setMetadata(address, size, SIZE_COLOR);
    setMetadata(address + 1, FREE, FREE_COLOR);
}

function markUsed(address, size) {
    let blockSize = sizeOf(address);

    clearMetadata(address);
    clearMetadata(address + 1);
    clearMetadata(address + blockSize + 2);
    setMetadata(address, size, SIZE_COLOR);
    setMetadata(address + 1, ALLOCATED, ALLOCATED_COLOR);

    let nextAddress = address + size + 3;
    setMetadata(nextAddress, blockSize - size - 3, SIZE_COLOR);
    setMetadata(nextAddress + 1, FREE, FREE_COLOR);
    setMetadata(nextAddress + blockSize - size - 1, blockSize - size - 3, SIZE_COLOR);
    setMetadata(nextAddress - 1, size, SIZE_COLOR);

    return address + 2;
}

function isFree(address) {
    return memory[address + 1] === FREE;
}

function isLast(address) {
    return address + sizeOf(address) + 3 === totalMemory;
}

function next(address) {
    let to = address + sizeOf(address) + 3;
    return to;
}

function previous(address) {
    if (address === 0) {
        return null;
    }
    let to = address - memory[address - 1] - 3;
    return to;
}

function sizeOf(address) {
    return memory[address];
}

function coalesce(address) {
    if (!isLast(address)) {
        let nextAddress = next(address);
        if (nextAddress && isFree(nextAddress)) {
            let size = sizeOf(address);
            clearMetadata(address);
            clearMetadata(address + 1);
            clearMetadata(address + size + 2);

            let nextSize = sizeOf(nextAddress);
            clearMetadata(nextAddress);
            clearMetadata(nextAddress + 1);
            clearMetadata(nextAddress + nextSize + 2);

            let newSize = size + nextSize + 3;
            setMetadata(address, newSize, SIZE_COLOR);
            setMetadata(address + 1, FREE, FREE_COLOR);
            setMetadata(address + newSize + 2, size + nextSize + 3, SIZE_COLOR);
        }
    }

    if (address !== 0) {
        let previousAddress = previous(address);
        if (previousAddress !== null && isFree(previousAddress)) {
            let previousSize = sizeOf(previousAddress);
            clearMetadata(previousAddress);
            clearMetadata(previousAddress + 1);
            clearMetadata(previousAddress + previousSize + 2);

            let size = sizeOf(address);
            clearMetadata(address);
            clearMetadata(address + 1);
            clearMetadata(address + size + 2);

            let newSize = size + previousSize + 3;
            setMetadata(previousAddress, newSize, SIZE_COLOR);
            setMetadata(previousAddress + 1, FREE, FREE_COLOR);
            setMetadata(previousAddress + newSize + 2, newSize, SIZE_COLOR);
        }
    }
}

setMetadata(0, totalMemory - 3, SIZE_COLOR);
setMetadata(0 + 1, FREE, FREE_COLOR);
setMetadata(totalMemory - 1, totalMemory - 3, SIZE_COLOR);

// Because we only use a single byte to store the size of a block, we can only
// allocate blocks of up to 255 bytes. This works fine in the blog post, but
// in the allocator playground we have more memory. Let's grey that memory out
// to make it more clear it can't be used.
for (let i = 256; i < getTotalMemory(); i++) {
    annotateColor(i, metadataColor);
}

function malloc(size) {
    let address = 0;
    while (address < totalMemory) {
        if (isFree(address) && sizeOf(address) >= size + 3) {
            return markUsed(address, size);
        }
        address = next(address);
    }
    return -1;
}

function free(address) {
    markFree(address - 2);
    coalesce(address - 2);
}
