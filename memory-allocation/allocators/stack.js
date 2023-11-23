/*
 * Welcome to the Allocator Playground!
 *
 * The way it works is that you implement malloc and free over here on the left,
 * and then it gets visualised on the right. The visualisation gets updated
 * whenever you modify the code on the left, so you can see how your allocator
 * works. If there's a problem with your allocator, the visualisation won't
 * update. Instead, you'll get a red underline somewhere in your code telling you
 * what the problem is.
 *
 * Up at the top you'll notice some controls. The "allocator" dropdown has some
 * pre-made allocators for you to play with. The "workloads" dropdown changes the
 * set of malloc/free calls you'll have to service. Then over on the right you
 * can see "memory" and "logs" buttons. By default, you see "memory". Clicking on
 * "logs" will show you a text representation of what happened. It's in here you
 * will also see your own log messages.
 *
 * Selecting a new allocator or workload will reset the visualisation.
 * Additionally, if you select a new allocator by accident you can always undo it
 * by pressing Ctrl+Z (or Cmd+Z on Mac).
 *
 * In the middle of the screen at the top are some fun performance metrics.
 * These are updated every time you run the workload. The ops/ms count show how
 * many operations (malloc/free) could be performed per millisecond. This isn't
 * super accurate as JavaScript timing resolution isn't very high. The "peak"
 * figure is the highest occupied memory address at any point during the
 * workload.
 */

// nextBlock holds the address of the next block to be allocated.
var nextBlock = 0;

// We have access to a variety of functions to help us visualise what's going
// on. annotateRange is one of them, and it allows us to mark a range of memory.
// We use it here to mark a single byte at the address of nextBlock.
//
// To see what other annotation functions are available, check out the
// "Annotations" allocator in the dropdown.
annotateRange(nextBlock, 1);

// What follows is a very simple malloc implementation. Every time it is called,
// it returns the value of nextBlock and increments nextBlock by the size.
function malloc(size) {
    let addr = nextBlock;
    nextBlock += size;

    // We can also use the log function to print out messages to the log view.
    // There are three log levels: info, warn, and error.
    info(`nextBlock moved forward by ${size}!`);

    // It's important to remove annotations when they're no longer valid. If we
    // don't, we'll end up with a bunch of annotations overlapping each other
    // in confusing ways.
    removeRange(addr);
    annotateRange(nextBlock, 1);
    return addr;
}

// free is a no-op in this allocator. We don't have enough information to free
// any block of memory, but the function has to be defined for the allocator
// to be considered valid.
function free(addr) {
    return;
}
