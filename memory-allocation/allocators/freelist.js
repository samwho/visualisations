let allocations = [];
let freelist = [{ address: 0, size: getTotalMemory() }];
annotateRange(0, getTotalMemory());

opts.coalesce = opts.coalesce ? opts.coalesce === 'true' : true;
opts.minsize = opts.minsize ? parseInt(opts.minsize) : null;
opts.align = opts.align ? parseInt(opts.align) : null;

function findCandidate(size) {
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
    if (candidate.size === 0) {
        freelist.splice(index, 1);
    } else {
        annotateRange(candidate.address, candidate.size);
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
    let location = freelist.findIndex(block => block.address > allocation.address);
    if (location === -1) {
        location = freelist.length;
    }
    freelist.splice(location, 0, allocation);
    allocations.splice(index, 1);
    annotateRange(allocation.address, allocation.size);
    if (opts.coalesce) {
        coalesce(location);
    }
}

function coalesce(index) {
    var current = freelist[index];
    if (index < freelist.length - 1) {
        let next = freelist[index + 1];
        if (current.address + current.size === next.address) {
            info(`coalescing ${current.address} and ${next.address}`);
            removeRange(next.address);
            removeRange(current.address);

            current.size += next.size;
            freelist.splice(index + 1, 1);

            annotateRange(current.address, current.size);
        }
    }

    if (index > 0) {
        let prev = freelist[index - 1];
        if (prev.address + prev.size === current.address) {
            info(`coalescing ${prev.address} and ${current.address}`);
            prev.size += current.size;
            freelist.splice(index, 1);

            removeRange(prev.address);
            removeRange(current.address);
            annotateRange(prev.address, prev.size);
        }
    }
}

function malloc(size) {
    if (opts.minsize && size < opts.minsize) {
        size = opts.minsize;
    }
    if (opts.align) {
        size = Math.ceil(size / opts.align) * opts.align;
    }
    var [candidate, index] = findCandidate(size);
    if (candidate === null) {
        return -1;
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
