import fs from "fs";
import { Command } from "commander";
import { transform } from "./transform";
import { highlight } from "./highlight";

const program = new Command();

program
  .command("transform")
  .description("Transform JS into debuggable generator functions")
  .argument("<path>", "file to transform")
  .action((path) => {
    const code = fs.readFileSync(path, "utf-8");
    const transformed = transform(code);
    console.log(transformed);
  });

program
  .command("highlight")
  .description("Highlight JS code")
  .argument("<path>", "file to highlight")
  .action((path) => {
    const code = fs.readFileSync(path, "utf-8");
    const highlighted = highlight(code);
    console.log(highlighted);
  });

program.parse();
