import {LexicalError, LexResult, Token, TokenType} from "./tokens";

const KEYWORDS = new Set(["new", "bi", "startvoice", "endvoice"]);
const OPERATORS = new Set(["+", "-", "*", "=", "=>", "<="]);
const SORTED_OPERATORS = Array.from(OPERATORS).sort((a, b) => b.length - a.length);
const PUNCTUATIONS = new Set(["(", ")", "[", "]", ",", ".", ":"]);
const SORTED_PUNCTUATIONS = Array.from(PUNCTUATIONS).sort((a, b) => b.length - a.length);

export class Lexer {
  private readonly code: string;

  constructor(code: string) {
    this.code = code;
  }

  lex(): LexResult {
    const tokens: Token[] = [];
    const lexicalErrors: LexicalError[] = [];
    let i = 0;

    const code = this.code;

    const push = (type: TokenType, s: number, e: number) =>
      tokens.push({type, span: {start: s, end: e}, value: code.slice(s, e)});

    // TODO: throw lexical errors

    function try_consume_number() {
      if (!(/[0-9]/.test(code[i])) && !(i+1 < code.length && code[i] === "-" && /[0-9]/.test(code[i+1]))) {
        return false;
      }
      const s = i++;
      while (i < code.length && /[0-9_]/.test(code[i])) i++;
      if (i < code.length && code[i] === ".") {
        i++;
        while (i < code.length && /[0-9_]/.test(code[i])) i++;
      }
      if (i + 1 < code.length && (code[i] === "e" || code[i] === "E") && /[0-9-+]/.test(code[i + 1])) {
        i++;
        if (i < code.length && (code[i] === "+" || code[i] === "-")) i++;
        while (i < code.length && /[0-9_]/.test(code[i])) i++;
      }
      const numberText = code.slice(s, i).replace(/_/g, "");
      let numberValue = Number(numberText);
      const unitStart = i;
      while (i < code.length && /[A-Za-z%]/.test(code[i])) i++;
      const unit = unitStart < i ? code.slice(unitStart, i) : "";
      push("number", s, i);
      tokens[tokens.length - 1].numberValue = numberValue;
      tokens[tokens.length - 1].unit = unit;
      return true;
    }

    function try_consume_operator() {
      for (const op of SORTED_OPERATORS) {
        if (code.startsWith(op, i)) {
          push("operator", i, i + op.length);
          i += op.length;
          return true;
        }
      }
      return false;
    }

    function try_consume_identifier() {
      if (/[A-Za-z_]/.test(code[i])) {
        const s = i++;
        while (i < code.length && /[A-Za-z0-9_]/.test(code[i])) i++;
        const text = code.slice(s, i);
        push(KEYWORDS.has(text) ? "keyword" : "identifier", s, i);
        return true;
      }
      return false;
    }

    function try_consume_punctuation() {
      for (const p of SORTED_PUNCTUATIONS) {
        if (code.startsWith(p, i)) {
          push("punctuation", i, i + p.length);
          i += p.length;
          return true;
        }
      }
      return false;
    }

    while (i < code.length) {

      // skip whitespace
      if (/\s/.test(code[i])) {
        i++;
        continue;
      }

      if (try_consume_number()) continue;
      if (try_consume_operator()) continue;
      if (try_consume_identifier()) continue;
      if (try_consume_punctuation()) continue;

      // fallback: consume one char to avoid infinite loop
      // TODO: throw lexical error
      i++;
    }

    return {tokens, lexicalErrors};
  }
}


