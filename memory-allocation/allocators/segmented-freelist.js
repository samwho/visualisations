opts.coalesce = opts.coalesce ? opts.coalesce === 'true' : true;
opts.smallfreelistsize = opts.smallfreelistsize ? parseInt(opts.smallfreelistsize) : 64;
opts.smallfreelistthreshold = opts.smallfreelistthreshold ? parseInt(opts.smallfreelistthreshold) : 4;

let allocations = [];
let smallFreelist = [{
    address: 0,
    size: opts.smallfreelistsize
}];
let largeFreelist = [{
    address: opts.smallfreelistsize,
    size: getTotalMemory() - opts.smallfreelistsize
}];

annotateRange(0, opts.smallfreelistsize, 0xaaaaaa);
annotateRange(opts.smallfreelistsize, getTotalMemory() - opts.smallfreelistsize, 0x777777);

function getFreelist(size) {
    if (size <= opts.smallfreelistthreshold) {
        return [smallFreelist, 0xaaaaaa];
    }
    return [largeFreelist, 0x777777];
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

    var [freelist, color] = getFreelist(size);
    if (candidate.size === 0) {
        freelist.splice(index, 1);
    } else {
        annotateRange(candidate.address, candidate.size, color);
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
    let [freelist, color] = getFreelist(allocation.size);
    let location = freelist.findIndex(block => block.address > allocation.address);
    if (location === -1) {
        location = freelist.length;
    }
    freelist.splice(location, 0, allocation);
    allocations.splice(index, 1);
    annotateRange(allocation.address, allocation.size, color);
    if (opts.coalesce) {
        coalesce(location, freelist, color);
    }
}

function coalesce(index, freelist, color) {
    var current = freelist[index];
    if (index < freelist.length - 1) {
        let next = freelist[index + 1];
        if (current.address + current.size === next.address) {
            removeRange(next.address);
            removeRange(current.address);

            current.size += next.size;
            freelist.splice(index + 1, 1);

            annotateRange(current.address, current.size, color);
        }
    }

    if (index > 0) {
        let prev = freelist[index - 1];
        if (prev.address + prev.size === current.address) {
            prev.size += current.size;
            freelist.splice(index, 1);

            removeRange(prev.address);
            removeRange(current.address);
            annotateRange(prev.address, prev.size, color);
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
