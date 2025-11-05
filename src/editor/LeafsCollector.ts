import {
  ASTNode,
  ASTNodeVisitor,
  BinaryExpr,
  Chain,
  ConstAccess,
  ConstConstruction,
  ConstDefinition,
  Construction,
  ErrorNode,
  Identifier,
  KeywordArg,
  MappingExpr,
  NumberLiteral,
  OutputAccess,
  PositionalArg,
  Program,
  SocketAccess,
  UnaryExpr,
  visitImplementation
} from "../language/ast";

export interface Leaf {
  node: ASTNode;
  scope: "global" | "voice";
}

interface Context {
  scope: "global" | "voice";
}

export class LeafsCollector implements ASTNodeVisitor<Context> {
  visit = visitImplementation;
  
  leafs: Leaf[] = [];
  
  collectLeafs(ast: Program): Leaf[] {
    this.leafs = [];
    for (const line of ast.lines) {
      const context: Context = {scope: line.isVoice ? "voice" : "global"};
      this.visit(line.statement, context);
    }
    return this.leafs;
  }
  
  visitProgram(_node: Program): void {
    throw new Error("LeafsCollector should not visit Program");
  }
  visitBinaryExpr(node: BinaryExpr, context: Context): void {
    this.visit(node.left, context);
    this.visit(node.right, context);
  }

  visitUnaryExpr(node: UnaryExpr, context: Context): void {
    this.visit(node.expr, context);
  }

  visitMappingExpr(node: MappingExpr, context: Context): void {
    this.visit(node.source, context);
    this.visit(node.from, context);
    this.visit(node.to, context);
  }

  visitErrorNode(_node: ErrorNode): void {
    // Do nothing
  }

  visitConstDefinition(node: ConstDefinition, context: Context): void {
    this.visit(node.value, context);
    this.leafs.push({node, scope: context.scope});
  }

  visitConstConstruction(node: ConstConstruction, context: Context): void {
    this.visitArgs(node, context);
    this.leafs.push({node, scope: context.scope});
  }

  visitConstruction(node: Construction, context: Context): void {
    this.visitArgs(node, context);
    this.leafs.push({node, scope: context.scope});
  }

  visitChain(node: Chain, context: Context): void {
    for (const link of [node.source, ...node.midSteps, node.target]) {
      this.visit(link, context);
    }
  }

  visitPositionalArg(node: PositionalArg, context: Context): void {
    this.visit(node.value, context);
    this.leafs.push({node, scope: context.scope});
  }

  visitKeywordArg(node: KeywordArg, context: Context): void {
    this.visit(node.value, context);
    this.leafs.push({node, scope: context.scope});
  }

  visitConstAccess(node: ConstAccess, context: Context): void {
    this.leafs.push({node, scope: context.scope});
  }

  visitNumberLiteral(node: NumberLiteral, context: Context): void {
    this.leafs.push({node, scope: context.scope});
  }

  visitSocketAccess(node: SocketAccess, context: Context): void {
    this.leafs.push({node, scope: context.scope});
  }

  visitOutputAccess(node: OutputAccess, context: Context): void {
    this.leafs.push({node, scope: context.scope});
  }

  visitIdentifier(_node: Identifier): void {
    throw new Error("leafsCollector should not this.visit Identifier");
  }

  visitArgs(node: Construction | ConstConstruction, context: Context): void {
    for (const arg of node.args) {
      this.visit(arg, context);
    }
    for (const kwarg of node.kwargs) {
      this.visit(kwarg, context);
    }
  }
}