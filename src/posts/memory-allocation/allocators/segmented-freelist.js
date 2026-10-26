opts.coalesce = opts.coalesce !== false && opts.coalesce !== 'false';
opts.smallfreelistsize = Number(opts.smallfreelistsize ?? 64);
opts.smallfreelistthreshold = Number(opts.smallfreelistthreshold ?? 4);

let allocations = [];
let smallFreelist = [{
    address: 0,
    size: opts.smallfreelistsize
}];
let largeFreelist = [{
    address: opts.smallfreelistsize,
    size: getTotalMemory() - opts.smallfreelistsize
}];

function annotateFreeBlock(address, size, list) {
    annotateRange(address, size, list === "small" ? 0xaaaaaa : 0x777777, list);
}

annotateFreeBlock(0, opts.smallfreelistsize, "small");
annotateFreeBlock(opts.smallfreelistsize, getTotalMemory() - opts.smallfreelistsize, "large");

function getFreelist(size) {
    if (size <= opts.smallfreelistthreshold) {
        return [smallFreelist, "small"];
    }
    return [largeFreelist, "large"];
}

function findCandidate(size, freelist = null) {
    if (freelist === null) {
        let [f, _] = getFreelist(size);
        freelist = f;
    }

    for (let i = 0; i < freelist.length; i++) {
        if (freelist[i].size >= size) {
            return [freelist[i], i]
        }
    }

    return [null, null];
}

function allocate(candidate, index, size) {
    let address = candidate.address;
    removeRange(address);
    candidate.address += size;
    candidate.size -= size;
    allocations.push({ address, size });

    var [freelist, list] = getFreelist(size);
    if (candidate.size === 0) {
        freelist.splice(index, 1);
    } else {
        annotateFreeBlock(candidate.address, candidate.size, list);
    }
    return address;
}

function findAllocation(address) {
    for (let i = 0; i < allocations.length; i++) {
        if (allocations[i].address === address) {
            return [allocations[i], i]
        }
    }
    return [null, null];
}

function deallocate(allocation, index) {
    let [freelist, list] = getFreelist(allocation.size);
    let location = freelist.findIndex(block => block.address > allocation.address);
    if (location === -1) {
        location = freelist.length;
    }
    freelist.splice(location, 0, allocation);
    allocations.splice(index, 1);
    annotateFreeBlock(allocation.address, allocation.size, list);
    if (opts.coalesce) {
        coalesce(location, freelist, list);
    }
}

function coalesce(index, freelist, list) {
    var current = freelist[index];
    if (index < freelist.length - 1) {
        let next = freelist[index + 1];
        if (current.address + current.size === next.address) {
            removeRange(next.address);
            removeRange(current.address);

            current.size += next.size;
            freelist.splice(index + 1, 1);

            annotateFreeBlock(current.address, current.size, list);
        }
    }

    if (index > 0) {
        let prev = freelist[index - 1];
        if (prev.address + prev.size === current.address) {
            prev.size += current.size;
            freelist.splice(index, 1);

            removeRange(prev.address);
            removeRange(current.address);
            annotateFreeBlock(prev.address, prev.size, list);
        }
    }
}

function malloc(size) {
    var [candidate, index] = findCandidate(size);
    if (candidate === null) {
        if (size > opts.smallfreelistthreshold) {
            return -1;
        }

        size = opts.smallfreelistthreshold + 1;
        [candidate, index] = findCandidate(size, largeFreelist);
        if (candidate === null) {
            return -1;
        }
    }
    return allocate(candidate, index, size);
}

function free(address) {
    let [allocation, index] = findAllocation(address);
    if (allocation === null) {
        return;
    }
    deallocate(allocation, index);
}
