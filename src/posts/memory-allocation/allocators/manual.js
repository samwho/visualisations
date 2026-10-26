// Used by the article's introductory examples, which supply exact addresses.
let nextAddress = 0;

function malloc(size, address = nextAddress) {
    nextAddress = Math.max(nextAddress, address + size);
    return address;
}

function free(address) {}
