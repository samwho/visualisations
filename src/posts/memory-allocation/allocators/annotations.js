annotateRange(0x0, 0x8, 0xFF0000);
annotateText(0x9, "H");
annotateText(0xa, "E");
annotateText(0xb, "L");
annotateText(0xc, "L");
annotateText(0xd, "O");
annotateColor(0xe, 0xFF0000);
annotateColor(0xf, 0x00FF00);
annotateColor(0x10, 0x0000FF);
annotatePointer(0x11, 0x60);

var nextBlock = 0;
function malloc(size) { return (nextBlock += size) - size }
function free(addr) {
    // All annotation functions have corresponding removal functions.
    removeRange(0x0);
    removeText(0x9);
    removeText(0xa);
    removeText(0xb);
    removeText(0xc);
    removeText(0xd);
    removeColor(0xe);
    removeColor(0xf);
    removeColor(0x10);
    removePointer(0x11);
}
