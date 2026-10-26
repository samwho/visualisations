// Edit this grammar, not TlangParser.js/.d.ts; run bun run generate:turing-parser.
{
  let i = 0;
  let seen = new Map();
}

Program "program"
  = line:(ProgramLine / Comment / Newline)* {
    return line.filter(line => line !== null && line !== "\n");
  }

ProgramLine "program line"
  = ws label:Label ws "|" ws read:ReadValue ws "|" ws instructions:Instruction+ ws goto:Goto? ws "\n"? {
      if (seen.get(label.text)?.has(read.text)) {
        const error = new SyntaxError(`Duplicate state|value combo, state: "${label.text}" value: "${read.text}"`);
        error.location = location();
        throw error;
      }

      if (!seen.has(label.text)) {
        seen.set(label.text, new Set());
      }
      seen.get(label.text).add(read.text);

      if (!goto) {
        if (instructions[instructions.length - 1].type !== "halt") {
          instructions.push({ type: "halt" });
        }
      } else {
        instructions.push({ type: "goto", label: goto.text, location: goto.location });
      }
      i++;
      return {
        index: i,
        label,
        read,
        instructions,
      };
    }

Instruction "instruction"
  = LeftInstruction / RightInstruction / PrintInstruction / HaltInstruction

LeftInstruction "left instruction"
  = ws "L" ws { return { type: "left", location: location() }; }

RightInstruction "right instruction"
  = ws "R" ws { return { type: "right", location: location() }; }

PrintInstruction "write instruction"
  = ws "P(" value:[^)] ")" ws { return { type: "print", value: value.trim(), location: location() }; }

HaltInstruction "halt instruction"
  = ws "H" ws { return { type: "halt", location: location() }; }

Goto "target label"
  = ws "->" ws label:Label { return { text: label.text, location: location() }; }

Label "machine state"
  = [a-zA-Z0-9_]* { return { text: text(), location: location() }; }

ReadValue "value under head"
  = [a-zA-Z0-9-\*]* { return { text: text(), location: location() }; }

Comment "comment"
  = ("#"/"//") [^\n]* { return null; }

Newline "newline"
  = "\n"

ws "whitespace"
  = [ \t]*
