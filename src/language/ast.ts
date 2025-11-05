import {Span} from "./Span";

export interface ASTNodeBase {
  type: string;
  span: Span;
}

export interface ProgramLine {
  statement: Statement;
  isVoice: boolean;
}

export interface Program extends ASTNodeBase {
  type: "Program";
  lines: ProgramLine[];
}

export interface ErrorNode extends ASTNodeBase {
  type: "ErrorNode";
  message: string;
}

export type Statement =
  | ConstDefinition
  | ConstConstruction
  | Chain
  | ErrorNode;

export interface ConstDefinition extends ASTNodeBase {
  type: "ConstDefinition";
  name: Identifier;
  value: OutExpr | InExpr;
}

export interface ConstConstruction extends ASTNodeBase {
  type: "ConstConstruction";
  className: Identifier;
  name: Identifier;
  args: PositionalArg[];
  kwargs: KeywordArg[];
}

export interface Construction extends ASTNodeBase {
  type: "Construction";
  className: Identifier;
  args: PositionalArg[];
  kwargs: KeywordArg[];
}

export interface Chain extends ASTNodeBase {
  type: "Chain";
  source: OutExpr;
  midSteps: MidExpr[];
  target: InExpr
}

export type MidExpr = ConstConstruction | Construction | ConstAccess | ErrorNode;

export type OutExpr =
  | MidExpr
  | UnaryExpr
  | BinaryExpr
  | MappingExpr
  | OutputAccess
  | NumberLiteral;

export type InExpr =
  | MidExpr
  | SocketAccess;

export interface UnaryExpr extends ASTNodeBase {
  type: "UnaryExpr";
  op: UnaryOp;
  expr: OutExpr;
}

export interface BinaryExpr extends ASTNodeBase {
  type: "BinaryExpr";
  op: BinaryOp;
  left: OutExpr;
  right: OutExpr;
}

export interface MappingExpr extends ASTNodeBase {
  type: "MappingExpr";
  kind: "unipolar" | "bipolar";
  source: OutExpr;
  from: OutExpr;
  to: OutExpr;
}


export interface ConstAccess extends ASTNodeBase {
  type: "ConstAccess";
  name: Identifier;
}

export interface SocketAccess extends ASTNodeBase {
  type: "SocketAccess";
  object: Identifier;
  socket: Identifier;
}

export interface OutputAccess extends ASTNodeBase {
  type: "OutputAccess";
  object: Identifier;
  output: Identifier;
}

export interface PositionalArg extends ASTNodeBase {
  type: "PositionalArg";
  value: OutExpr;
}

export interface KeywordArg extends ASTNodeBase {
  type: "KeywordArg";
  name: Identifier;
  value: OutExpr;
}

export interface Identifier extends ASTNodeBase {
  type: "Identifier";
  name: string;
}

export interface NumberLiteral extends ASTNodeBase {
  type: "NumberLiteral";
  value: number;
  unit?: string; // e.g. "hz", "db", "s"
}


export type BinaryOp = "+" | "-" | "*"
export type UnaryOp = "+" | "-"

export type ASTNode =
  | Program
  | ErrorNode
  | Statement
  | ConstDefinition
  | ConstConstruction
  | Construction
  | Chain
  | MidExpr
  | OutExpr
  | InExpr
  | UnaryExpr
  | BinaryExpr
  | MappingExpr
  | ConstAccess
  | SocketAccess
  | OutputAccess
  | PositionalArg
  | KeywordArg
  | Identifier
  | NumberLiteral;

type MaybeArg<ArgT> = ArgT extends void ? [] : [ArgT];

export interface ASTNodeVisitor<ArgT = void, ReturnT = void> {
  visit: (node: ASTNode, ...args: MaybeArg<ArgT>) => ReturnT;

  visitProgram: (node: Program, ...args: MaybeArg<ArgT>) => ReturnT;
  visitErrorNode: (node: ErrorNode, ...args: MaybeArg<ArgT>) => ReturnT;
  visitConstDefinition: (node: ConstDefinition, ...args: MaybeArg<ArgT>) => ReturnT;
  visitConstConstruction: (node: ConstConstruction, ...args: MaybeArg<ArgT>) => ReturnT;
  visitConstruction: (node: Construction, ...args: MaybeArg<ArgT>) => ReturnT;
  visitChain: (node: Chain, ...args: MaybeArg<ArgT>) => ReturnT;
  visitConstAccess: (node: ConstAccess, ...args: MaybeArg<ArgT>) => ReturnT;
  visitSocketAccess: (node: SocketAccess, ...args: MaybeArg<ArgT>) => ReturnT;
  visitOutputAccess: (node: OutputAccess, ...args: MaybeArg<ArgT>) => ReturnT;
  visitUnaryExpr: (node: UnaryExpr, ...args: MaybeArg<ArgT>) => ReturnT;
  visitBinaryExpr: (node: BinaryExpr, ...args: MaybeArg<ArgT>) => ReturnT;
  visitMappingExpr: (node: MappingExpr, ...args: MaybeArg<ArgT>) => ReturnT;
  visitPositionalArg: (node: PositionalArg, ...args: MaybeArg<ArgT>) => ReturnT;
  visitKeywordArg: (node: KeywordArg, ...args: MaybeArg<ArgT>) => ReturnT;
  visitIdentifier: (node: Identifier, ...args: MaybeArg<ArgT>) => ReturnT;
  visitNumberLiteral: (node: NumberLiteral, ...args: MaybeArg<ArgT>) => ReturnT;
}

export function visitImplementation<ArgT = void, ReturnT = void>(this: ASTNodeVisitor<ArgT, ReturnT>, node: ASTNode, ...args: MaybeArg<ArgT>): ReturnT {
  switch (node.type) {
    case "Program":
      return this.visitProgram(node, ...args);
    case "ErrorNode":
      return this.visitErrorNode(node, ...args);
    case "ConstDefinition":
      return this.visitConstDefinition(node, ...args);
    case "ConstConstruction":
      return this.visitConstConstruction(node, ...args);
    case "Construction":
      return this.visitConstruction(node, ...args);
    case "Chain":
      return this.visitChain(node, ...args);
    case "ConstAccess":
      return this.visitConstAccess(node, ...args);
    case "SocketAccess":
      return this.visitSocketAccess(node, ...args);
    case "OutputAccess":
      return this.visitOutputAccess(node, ...args);
    case "UnaryExpr":
      return this.visitUnaryExpr(node, ...args);
    case "BinaryExpr":
      return this.visitBinaryExpr(node, ...args);
    case "MappingExpr":
      return this.visitMappingExpr(node, ...args);
    case "PositionalArg":
      return this.visitPositionalArg(node, ...args);
    case "KeywordArg":
      return this.visitKeywordArg(node, ...args);
    case "Identifier":
      return this.visitIdentifier(node, ...args);
    case "NumberLiteral":
      return this.visitNumberLiteral(node, ...args);
    default:
      assertNever(node);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled node: ${JSON.stringify(x)}`);
}