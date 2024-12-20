// @generated by Peggy 4.1.1.
//
// https://peggyjs.org/


function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = (this.location.source && (typeof this.location.source.offset === "function"))
      ? this.location.source.offset(s)
      : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + offset_s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { Program: peg$parseProgram };
  var peg$startRuleFunction = peg$parseProgram;

  var peg$c0 = "|";
  var peg$c1 = "\n";
  var peg$c2 = "L";
  var peg$c3 = "R";
  var peg$c4 = "P(";
  var peg$c5 = ")";
  var peg$c6 = "H";
  var peg$c7 = "->";
  var peg$c8 = "#";
  var peg$c9 = "//";

  var peg$r0 = /^[^)]/;
  var peg$r1 = /^[a-zA-Z0-9_]/;
  var peg$r2 = /^[a-zA-Z0-9\-*]/;
  var peg$r3 = /^[^\n]/;
  var peg$r4 = /^[ \t]/;

  var peg$e0 = peg$otherExpectation("program");
  var peg$e1 = peg$otherExpectation("program line");
  var peg$e2 = peg$literalExpectation("|", false);
  var peg$e3 = peg$literalExpectation("\n", false);
  var peg$e4 = peg$otherExpectation("instruction");
  var peg$e5 = peg$otherExpectation("left instruction");
  var peg$e6 = peg$literalExpectation("L", false);
  var peg$e7 = peg$otherExpectation("right instruction");
  var peg$e8 = peg$literalExpectation("R", false);
  var peg$e9 = peg$otherExpectation("write instruction");
  var peg$e10 = peg$literalExpectation("P(", false);
  var peg$e11 = peg$classExpectation([")"], true, false);
  var peg$e12 = peg$literalExpectation(")", false);
  var peg$e13 = peg$otherExpectation("halt instruction");
  var peg$e14 = peg$literalExpectation("H", false);
  var peg$e15 = peg$otherExpectation("target label");
  var peg$e16 = peg$literalExpectation("->", false);
  var peg$e17 = peg$otherExpectation("machine state");
  var peg$e18 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false);
  var peg$e19 = peg$otherExpectation("value under head");
  var peg$e20 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "-", "*"], false, false);
  var peg$e21 = peg$otherExpectation("comment");
  var peg$e22 = peg$literalExpectation("#", false);
  var peg$e23 = peg$literalExpectation("//", false);
  var peg$e24 = peg$classExpectation(["\n"], true, false);
  var peg$e25 = peg$otherExpectation("newline");
  var peg$e26 = peg$otherExpectation("whitespace");
  var peg$e27 = peg$classExpectation([" ", "\t"], false, false);

  var peg$f0 = function(line) {
    return line.filter(line => line !== null && line !== "\n");
  };
  var peg$f1 = function(label, read, instructions, goto) {
      if (seen[label.text]?.[read.text]) {
        const error = new SyntaxError(`Duplicate state|value combo, state: "${label.text}" value: "${read.text}"`);
        error.location = location();
        throw error;
      }

      seen[label.text] = seen[label.text] || {};
      seen[label.text][read.text] = true;

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
    };
  var peg$f2 = function() { return { type: "left", location: location() }; };
  var peg$f3 = function() { return { type: "right", location: location() }; };
  var peg$f4 = function(value) { return { type: "print", value: value.trim(), location: location() }; };
  var peg$f5 = function() { return { type: "halt", location: location() }; };
  var peg$f6 = function(label) { return { text: label.text, location: location() }; };
  var peg$f7 = function() { return { text: text(), location: location() }; };
  var peg$f8 = function() { return { text: text(), location: location() }; };
  var peg$f9 = function() { return null; };
  var peg$currPos = options.peg$currPos | 0;
  var peg$savedPos = peg$currPos;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;

  var peg$result;

  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function offset() {
    return peg$savedPos;
  }

  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && (typeof peg$source.offset === "function")) {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parseProgram() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseProgramLine();
    if (s2 === peg$FAILED) {
      s2 = peg$parseComment();
      if (s2 === peg$FAILED) {
        s2 = peg$parseNewline();
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parseProgramLine();
      if (s2 === peg$FAILED) {
        s2 = peg$parseComment();
        if (s2 === peg$FAILED) {
          s2 = peg$parseNewline();
        }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f0(s1);
    s0 = s1;
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e0); }

    return s0;
  }

  function peg$parseProgramLine() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    s2 = peg$parseLabel();
    s3 = peg$parsews();
    if (input.charCodeAt(peg$currPos) === 124) {
      s4 = peg$c0;
      peg$currPos++;
    } else {
      s4 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e2); }
    }
    if (s4 !== peg$FAILED) {
      s5 = peg$parsews();
      s6 = peg$parseReadValue();
      s7 = peg$parsews();
      if (input.charCodeAt(peg$currPos) === 124) {
        s8 = peg$c0;
        peg$currPos++;
      } else {
        s8 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e2); }
      }
      if (s8 !== peg$FAILED) {
        s9 = peg$parsews();
        s10 = [];
        s11 = peg$parseInstruction();
        if (s11 !== peg$FAILED) {
          while (s11 !== peg$FAILED) {
            s10.push(s11);
            s11 = peg$parseInstruction();
          }
        } else {
          s10 = peg$FAILED;
        }
        if (s10 !== peg$FAILED) {
          s11 = peg$parsews();
          s12 = peg$parseGoto();
          if (s12 === peg$FAILED) {
            s12 = null;
          }
          s13 = peg$parsews();
          if (input.charCodeAt(peg$currPos) === 10) {
            s14 = peg$c1;
            peg$currPos++;
          } else {
            s14 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e3); }
          }
          if (s14 === peg$FAILED) {
            s14 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f1(s2, s6, s10, s12);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e1); }
    }

    return s0;
  }

  function peg$parseInstruction() {
    var s0, s1;

    peg$silentFails++;
    s0 = peg$parseLeftInstruction();
    if (s0 === peg$FAILED) {
      s0 = peg$parseRightInstruction();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePrintInstruction();
        if (s0 === peg$FAILED) {
          s0 = peg$parseHaltInstruction();
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e4); }
    }

    return s0;
  }

  function peg$parseLeftInstruction() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    if (input.charCodeAt(peg$currPos) === 76) {
      s2 = peg$c2;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e6); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parsews();
      peg$savedPos = s0;
      s0 = peg$f2();
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }

    return s0;
  }

  function peg$parseRightInstruction() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    if (input.charCodeAt(peg$currPos) === 82) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e8); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parsews();
      peg$savedPos = s0;
      s0 = peg$f3();
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e7); }
    }

    return s0;
  }

  function peg$parsePrintInstruction() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    if (input.substr(peg$currPos, 2) === peg$c4) {
      s2 = peg$c4;
      peg$currPos += 2;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e10); }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r0.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e11); }
      }
      if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 41) {
          s4 = peg$c5;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e12); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsews();
          peg$savedPos = s0;
          s0 = peg$f4(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e9); }
    }

    return s0;
  }

  function peg$parseHaltInstruction() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    if (input.charCodeAt(peg$currPos) === 72) {
      s2 = peg$c6;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e14); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parsews();
      peg$savedPos = s0;
      s0 = peg$f5();
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e13); }
    }

    return s0;
  }

  function peg$parseGoto() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsews();
    if (input.substr(peg$currPos, 2) === peg$c7) {
      s2 = peg$c7;
      peg$currPos += 2;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e16); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parsews();
      s4 = peg$parseLabel();
      peg$savedPos = s0;
      s0 = peg$f6(s4);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e15); }
    }

    return s0;
  }

  function peg$parseLabel() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r1.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e18); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e18); }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f7();
    s0 = s1;
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e17); }

    return s0;
  }

  function peg$parseReadValue() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e20); }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e20); }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f8();
    s0 = s1;
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e19); }

    return s0;
  }

  function peg$parseComment() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 35) {
      s1 = peg$c8;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e22); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c9) {
        s1 = peg$c9;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e23); }
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = input.charAt(peg$currPos);
      if (peg$r3.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e24); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = input.charAt(peg$currPos);
        if (peg$r3.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e24); }
        }
      }
      peg$savedPos = s0;
      s0 = peg$f9();
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e21); }
    }

    return s0;
  }

  function peg$parseNewline() {
    var s0, s1;

    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 10) {
      s0 = peg$c1;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e3); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e25); }
    }

    return s0;
  }

  function peg$parsews() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r4.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e27); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r4.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e27); }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e26); }

    return s0;
  }


  let i = 0;
  let seen = {};

  peg$result = peg$startRuleFunction();

  if (options.peg$library) {
    return /** @type {any} */ ({
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    });
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

const peg$allowedStartRules = [
  "Program"
];

export {
  peg$allowedStartRules as StartRules,
  peg$SyntaxError as SyntaxError,
  peg$parse as parse
};