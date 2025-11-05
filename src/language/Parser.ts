import {
  BinaryOp,
  ConstConstruction,
  ErrorNode,
  Identifier,
  InExpr,
  KeywordArg,
  MidExpr,
  OutExpr,
  PositionalArg,
  Program, ProgramLine,
  Statement
} from "./ast";
import {LexResult, Token, TokenType} from "./tokens";
import {Span} from "./Span";

export interface ParseResult {
  ast: Program;
  syntaxErrors: SyntaxError[];
}

export interface SyntaxError {
  message: string;
  span: Span;
}

const BINARY_OPERATOR_PRECEDENCE: { [op: string]: number } = {
  "+": 1,
  "-": 1,
  "*": 2,
}

const ERROR_MESSAGE_UNEXPECTED_EOF = () => `Unexpected end of input`;
const ERROR_MESSAGE_UNEXPECTED_TOKEN = (found: string | undefined) => found ? `Unexpected token: '${found}'` : `Unexpected end of input`;
const ERROR_MESSAGE_UNEXPECTED_NOT_INPUT = () => `Cannot be used as an input`;
const ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT = () => `Cannot be used as an output`;
const ERROR_MESSAGE_UNEXPECTED_EXPRESSION = () => `Unexpected expression`;

export class Parser {
  private readonly tokens: Token[];
  private errors: SyntaxError[] = [];
  private pos: number = 0;

  constructor(lexResult: LexResult) {
    this.tokens = lexResult.tokens;
  }

  parse(): ParseResult {
    let insideVoiceBlock = false;
    let alreadyVisitedVoiceBlock = false;
    const lines: ProgramLine[] = [];
    // TODO: if startvoice is not closed, report error at the end
    while (this.pos < this.tokens.length) {
      if (this.match("keyword", "startvoice")) {
        if (insideVoiceBlock) {
          this.report("Nested voice blocks are not allowed", this.current());
        }
        if (alreadyVisitedVoiceBlock) {
          this.report("Multiple voice blocks are not allowed", this.current());
        }
        insideVoiceBlock = true;
        continue;
      }
      if (this.match("keyword", "endvoice")) {
        if (!insideVoiceBlock) {
          this.report("endvoice without matching startvoice", this.current());
        }
        insideVoiceBlock = false;
        continue;
      }
      const stmt = this.parseStatement();
      lines.push({statement: stmt, isVoice: insideVoiceBlock});
    }
    const start = this.tokens[0]?.span.start ?? 0;
    const end = this.tokens[this.tokens.length - 1]?.span.end ?? 0;
    return {
      ast: {
        type: "Program",
        lines,
        span: {start, end}
      },
      syntaxErrors: this.errors
    };
  }

  private parseStatement(): Statement {
    let token = this.current();
    if (!token) {
      return this.report(ERROR_MESSAGE_UNEXPECTED_EOF(), null);
    }
    const peeked = this.peek(1);
    if (token.type === "identifier" && peeked && peeked.type === "operator" && peeked.value === "=") {
      const nameToken = this.match("identifier")!;
      this.expect("operator", "=");
      const parsedExpr = this.parseExpr(0);
      const name = this.tokenToIdentifier(nameToken);
      const span = {start: nameToken.span.start, end: parsedExpr.expr.span.end};
      return {type: "ConstDefinition", name, value: parsedExpr.expr, span};
    }
    const parsedExpr = this.parseExpr(0);
    if (!parsedExpr.outExpr && !parsedExpr.inExpr) {
      return parsedExpr.expr as ErrorNode;
    }
    token = this.match("operator", "=>");
    if (token) {
      if (!parsedExpr.outExpr) {
        return this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), token);
      }
      const source = parsedExpr.expr as OutExpr;
      const midSteps: MidExpr[] = [];
      let last = null;
      while (true) {
        last = this.parseExpr(0);
        if (!last.inExpr && !last.outExpr) {
          return last.expr as ErrorNode;
        }
        midSteps.push(last.expr as MidExpr);
        const arrow = this.match("operator", "=>");
        if (!arrow)
          break;
      }
      if (!last.inExpr) {
        return this.report(ERROR_MESSAGE_UNEXPECTED_NOT_INPUT(), this.current());
      }
      midSteps.pop();
      const target = last.expr as InExpr;
      const span = {start: parsedExpr.expr.span.start, end: target.span.end};
      return {type: "Chain", source, midSteps, target, span};
    }

    token = this.match("operator", "<=");
    if (token) {
      if (!parsedExpr.inExpr) {
        return this.report(ERROR_MESSAGE_UNEXPECTED_NOT_INPUT(), token);
      }
      const target = parsedExpr.expr as InExpr;
      const midSteps: MidExpr[] = [];
      let last = null;
      while (true) {
        last = this.parseExpr(0);
        if (!last.inExpr && !last.outExpr) {
          return last.expr as ErrorNode;
        }
        midSteps.push(last.expr as MidExpr);
        const arrow = this.match("operator", "=>");
        if (!arrow)
          break;
      }
      if (!last.outExpr) {
        return this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), this.current());
      }
      midSteps.pop();
      const source = last.expr as OutExpr;
      const span = {start: parsedExpr.expr.span.start, end: target.span.end};
      return {type: "Chain", source, midSteps, target, span};
    }

    if (!parsedExpr.inExpr && !parsedExpr.outExpr) {
      return parsedExpr.expr as ErrorNode;
    }
    if (parsedExpr.expr.type !== "ConstConstruction") {
      return this.report(ERROR_MESSAGE_UNEXPECTED_EXPRESSION(), this.current());
    }
    return parsedExpr.expr as ConstConstruction;
  }

  private parseExpr(precedence = 0): { expr: InExpr | OutExpr, inExpr: boolean, outExpr: boolean } {
    let left = this.parsePrimary();
    if (!left.outExpr) {
      return left;
    }
    while (true) {
      const opToken = this.current();
      if (!opToken || opToken.type !== "operator")
        break;
      const opPrecedence = BINARY_OPERATOR_PRECEDENCE[opToken.value];
      if (opPrecedence === undefined || opPrecedence < precedence)
        break;
      this.advance();
      const right = this.parseExpr(opPrecedence + 1);
      if (!right.outExpr) {
        return {
          expr: this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), opToken),
          inExpr: false,
          outExpr: false
        }
      }
      const span = {start: left.expr.span.start, end: right.expr.span.end};
      left = {
        expr: {
          type: "BinaryExpr",
          op: opToken.value as BinaryOp,
          left: left.expr as OutExpr,
          right: right.expr as OutExpr,
          span
        },
        inExpr: false,
        outExpr: true
      };
    }

    return left;
  }

  private parsePrimary(): { expr: InExpr | OutExpr, inExpr: boolean, outExpr: boolean } {
    try {
      const result = this.parsePrimaryNoMapping();
      if (!result.outExpr) {
        return result;
      }
      let isBipolar = false;
      let token = this.match("punctuation", "[");
      if (!token) {
        token = this.match("keyword", "bi");
        if (token) {
          this.expect("punctuation", "[");
          isBipolar = true;
        }
      }
      if (token) {
        const from = this.parseExpr(0);
        if (!from.outExpr) {
          return {
            // TODO: better error position
            expr: this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), this.current()),
            inExpr: false,
            outExpr: false
          }
        }
        this.expect("punctuation", ",");
        const to = this.parseExpr(0);
        if (!to.outExpr) {
          return {
            // TODO: better error position
            expr: this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), this.current()),
            inExpr: false,
            outExpr: false
          }
        }
        const closing = this.expect("punctuation", "]");
        return {
          expr: {
            type: "MappingExpr",
            kind: isBipolar ? "bipolar" : "unipolar",
            source: result.expr as OutExpr,
            from: from.expr as OutExpr,
            to: to.expr as OutExpr,
            span: {start: result.expr.span.start, end: closing.span.end}
          },
          inExpr: false,
          outExpr: true
        };
      }
      return result;
    } catch (e) {
      return {
        expr: e as ErrorNode,
        inExpr: false,
        outExpr: false
      }
    }
  }

  private parsePrimaryNoMapping(): { expr: InExpr | OutExpr, inExpr: boolean, outExpr: boolean } {
    try {
      if (this.eof()) {
        throw this.report(ERROR_MESSAGE_UNEXPECTED_EOF(), null);
      }
      let token = this.match("operator", "-");
      if (!token) {
        token = this.match("operator", "+");
      }
      if (token) {
        const primary = this.parsePrimary();
        if (!primary.outExpr) {
          throw this.report(ERROR_MESSAGE_UNEXPECTED_NOT_OUTPUT(), this.current());
        }
        const expr = primary.expr as OutExpr;
        return {
          expr: {
            type: "UnaryExpr",
            op: token.value as "+" | "-",
            expr: expr,
            span: {start: token.span.start, end: expr.span.end}
          }, inExpr: false, outExpr: true
        }

      }
      token = this.match("number");
      if (token) {
        return {
          expr: {
            type: "NumberLiteral",
            value: token.numberValue!,
            unit: token.unit!,
            span: {start: token.span.start, end: token.span.end}
          }, inExpr: false, outExpr: true
        };
      }
      token = this.match("punctuation", "(");
      if (token) {
        const parsedExpr = this.parseExpr(0);
        const closing = this.expect("punctuation", ")");
        return {
          expr:
            {
              ...parsedExpr.expr,
              span: {start: token.span.start, end: closing.span.end}
            },
          inExpr: parsedExpr.inExpr, outExpr: parsedExpr.outExpr
        };
      }
      token = this.match("keyword", "new");
      if (token) {
        const className = this.expect("identifier");
        this.expect("punctuation", "(");
        const args = this.parseArgs();
        return {
          expr: {
            type: "Construction",
            className: this.tokenToIdentifier(className),
            ...args,
            span: {start: token.span.start, end: this.tokens[this.pos - 1].span.end}
          }, inExpr: true, outExpr: true
        };

      }
      token = this.match("identifier");
      if (token) {
        let next = this.match("punctuation", ".");
        if (next) {
          const socket = this.expect("identifier");
          return {
            expr: {
              type: "SocketAccess",
              object: this.tokenToIdentifier(token),
              socket: this.tokenToIdentifier(socket),
              span: {start: token.span.start, end: socket.span.end}
            },
            inExpr: true, outExpr: false
          }
        }
        next = this.match("punctuation", ":");
        if (next) {
          const output = this.expect("identifier");
          return {
            expr: {
              type: "OutputAccess",
              object: this.tokenToIdentifier(token),
              output: this.tokenToIdentifier(output),
              span: {start: token.span.start, end: output.span.end}
            },
            inExpr: false, outExpr: true
          };
        }
        let current = this.current();
        let peeked = this.peek(1);
        if (current && current.type === "identifier" && peeked && peeked.type === "punctuation" && peeked.value === "(") {
          next = this.expect("identifier");
          this.expect("punctuation", "(");
          const args = this.parseArgs();
          return {
            expr: {
              type: "ConstConstruction",
              className: this.tokenToIdentifier(token),
              name: this.tokenToIdentifier(next),
              ...args,
              span: {start: token.span.start, end: this.tokens[this.pos - 1].span.end}
            }, inExpr: true, outExpr: true
          };
        }
        return {
          expr: {
            type: "ConstAccess",
            name: this.tokenToIdentifier(token),
            span: {start: token.span.start, end: token.span.end}
          }, inExpr: true, outExpr: true
        };
      }
      throw this.reportAndRecover(ERROR_MESSAGE_UNEXPECTED_TOKEN(this.current()?.value), this.current());
    } catch (e) {
      return {
        expr: e as ErrorNode,
        inExpr: false,
        outExpr: false
      }
    }
  }

  private parseArgs(): { args: PositionalArg[], kwargs: KeywordArg[] } {
    const args: PositionalArg[] = [];
    const kwargs: KeywordArg[] = [];
    // TODO: positional args cant be after keyword args
    if (!this.match("punctuation", ")")) {
      while (true) {
        const arg = this.parseArg();
        if (arg.type === "ErrorNode") {
          throw arg;
        }
        if (arg.type === "KeywordArg") {
          kwargs.push(arg);
        } else {
          args.push(arg);
        }
        if (this.match("punctuation", ")")) {
          break;
        }
        this.expect("punctuation", ",");
      }
    }
    return {args, kwargs};
  }

  private parseArg(): PositionalArg | KeywordArg | ErrorNode {
    if (this.eof()) return this.report(ERROR_MESSAGE_UNEXPECTED_EOF(), null);
    let token = this.match("punctuation", ".");
    if (token) {
      let key = this.expect("identifier");
      this.expect("operator", "=");
      let value = this.parseExpr(0);
      if (!value.outExpr) {
        return this.reportAndRecover(ERROR_MESSAGE_UNEXPECTED_TOKEN(this.current()?.value), this.current());
      }
      return {
        type: "KeywordArg",
        name: this.tokenToIdentifier(key),
        value: value.expr as OutExpr,
        span: {start: token.span.start, end: value.expr.span.end}
      };
    }
    let value = this.parseExpr(0);
    if (!value.outExpr) {
      return this.reportAndRecover(ERROR_MESSAGE_UNEXPECTED_TOKEN(this.current()?.value), this.current());
    }
    return {
      type: "PositionalArg",
      value: value.expr as OutExpr,
      span: {start: value.expr.span.start, end: value.expr.span.end}
    };
  }

  private tokenToIdentifier(token: Token): Identifier {
    return {
      type: "Identifier",
      name: token.value,
      span: {start: token.span.start, end: token.span.end}
    };
  }

  private reportAndRecover(message: string, token: Token | null): ErrorNode {
    const errorNode = this.report(message, token);
    this.recover();
    return errorNode;
  }

  private report(message: string, token: Token | null): ErrorNode {
    const start = token?.span.start ?? -1;
    const end = token?.span.end ?? -1;
    this.errors.push({
      message,
      span: {start, end}
    });
    return {type: "ErrorNode", message, span: {start, end}};
  }

  private recover(): void {
    // TODO: change recovery strategy
    while (this.pos < this.tokens.length) {
      if (this.match("punctuation", ")") ||
          this.match("punctuation", "]")) {
        break;
      }
      this.advance()
    }
  }

  private current(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private expect(type: TokenType, value?: string): Token {
    if (this.eof()) throw this.reportAndRecover(ERROR_MESSAGE_UNEXPECTED_EOF(), null);
    const token = this.match(type, value);
    if (!token)
      throw this.reportAndRecover(ERROR_MESSAGE_UNEXPECTED_TOKEN(this.current()?.value), this.current());
    return token;
  }

  private match(type: TokenType, value?: string): Token | null {
    const token = this.current();
    if (token && token.type === type && (value === undefined || token.value === value)) {
      this.pos++;
      return token;
    }
    return null;
  }

  private peek(offset: number): Token | null {
    const index = this.pos + offset;
    return index < this.tokens.length ? this.tokens[index] : null;
  }

  private advance(): void {
    if (this.eof()) return;
    this.pos++;
  }

  private eof(): boolean {
    return this.pos >= this.tokens.length;
  }
}