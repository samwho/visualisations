# Visualisation Code

This repository contains the source code behind my visualisation blog posts.

- `numbers` - <https://samwho.dev/numbers>
- `bloom-filters/` - <https://samwho.dev/bloom-filters>
- `retries/` - <https://encore.dev/blog/retries>
- `hashing/` - <https://samwho.dev/hashing>
- `memory-allocation/` - <https://samwho.dev/memory-allocation>
- `load-balancing/` - <https://samwho.dev/load-balancing>
- `queueing/` - <https://encore.dev/blog/queueing>
- `reservoir-sampling/` - to be published

In the case of `load-balancing` and `memory-allocation` the code is vanilla
JavaScript that I include into pages with a simple `<script>` tag. It may
depend on other libraries that are also included into the page, and may be
difficult to run. I recommend looking at the HTML source of those posts to
figure out how to run it, if that's your goal.

For `hashing` and `retries` I began using Bun to build my code, as it's in
TypeScript, is better modularised, and depends on packages from NPM. This
code should be building with `bun install && bun run build` in both cases.
The output will be put into an `out/` directory and including that in a page
will give you access to the custom HTML elements I use throughout those posts.

Feel free to reach out if you have any questions about the code, and thanks
for showing an interest in my work!
