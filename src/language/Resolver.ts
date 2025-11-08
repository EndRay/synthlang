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
} from "./ast";
import {ParseResult} from "./Parser";
import {canBeInput, canBeOutput, getOutput, getSocket, SoundNodeClassInfo} from "./SoundNodeClassInfo";
import {GLOBAL_BUILTIN, VOICE_BUILTIN} from "./builtin";
import {Span} from "./Span";
import {classesAlias} from "./classes";

interface ExpressionTypeInfo {
  canBeInput: boolean;
  canBeOutput: boolean;
  nodeClass: SoundNodeClassInfo | null;
}

interface ConstDeclaration {
  node: ASTNode;
  span: Span;
}

export interface IdentifierResolution {
  type: string;
  expressionType: ExpressionTypeInfo;
}

interface ConstResolution extends IdentifierResolution {
  type: "const"
  declaration: ConstDeclaration;
}

interface BuiltinResolution extends IdentifierResolution {
  type: "builtin"
}

type Scope = Map<string, IdentifierResolution>;

export interface ResolveResult {
  ast: Program;
  globalScope: Scope;
  voiceScope: Scope;
  resolvedClasses: Map<string, SoundNodeClassInfo>;
  semanticErrors: SemanticError[];
}

interface SemanticError {
  message: string;
  span: Span;
}

type visitorContext = {currentScope: Scope, accessibleScopes: Scope[]};

export class Resolver implements ASTNodeVisitor<visitorContext> {
  visit = visitImplementation<visitorContext>;

  private globalScope: Scope = new Map();
  private voiceScope: Scope = new Map();
  private errors: SemanticError[] = [];

  private readonly resolvedClasses: Map<string, SoundNodeClassInfo> = new Map();

  private expressionsType: Map<ASTNode, ExpressionTypeInfo> = new Map();

  private readonly ast: Program;

  constructor(parseResult: ParseResult, classesList: SoundNodeClassInfo[]) {
    this.ast = parseResult.ast;
    for (const cls of classesList) {
      this.resolvedClasses.set(cls.className, cls);
    }
    for (const [className, cls] of classesAlias) {
      this.resolvedClasses.set(className, cls);
    }
    console.log(this.resolvedClasses);
    for (const [builtinName, builtinClass] of GLOBAL_BUILTIN.entries()) {
      const resolution: BuiltinResolution = {
        type: "builtin",
        expressionType: {
          canBeInput: canBeInput(builtinClass),
          canBeOutput: canBeOutput(builtinClass),
          nodeClass: builtinClass,
        }
      }
      this.globalScope.set(builtinName, resolution);
    }
    for (const [builtinName, builtinClass] of VOICE_BUILTIN.entries()) {
      const resolution: BuiltinResolution = {
        type: "builtin",
        expressionType: {
          canBeInput: canBeInput(builtinClass),
          canBeOutput: canBeOutput(builtinClass),
          nodeClass: builtinClass,
        }
      }
      this.voiceScope.set(builtinName, resolution);
    }
  }

  resolve(): ResolveResult {
    for (const line of this.ast.lines) {
      this.visit(line.statement, {
        currentScope: line.isVoice ? this.voiceScope : this.globalScope,
        accessibleScopes: line.isVoice ? [this.voiceScope, this.globalScope] : [this.globalScope],
      });
    }
    return {
      ast: this.ast,
      globalScope: this.globalScope,
      voiceScope: this.voiceScope,
      resolvedClasses: this.resolvedClasses,
      semanticErrors: this.errors,
    };
  }

  visitProgram(_node: Program) {
    throw new Error("Resolver.visitProgram should not be called");
  }

  visitIdentifier(_node: Identifier): void {
    throw new Error("Resolver.visitIdentifier should not be called");
  }

  visitPositionalArg(node: PositionalArg, context: visitorContext): void {
    this.visit(node.value, context);
  }

  visitKeywordArg(node: KeywordArg, context: visitorContext): void {
    this.visit(node.value, context);
  }

  visitNumberLiteral(node: NumberLiteral): void {
    this.expressionsType.set(node, {
      canBeInput: false,
      canBeOutput: true,
      nodeClass: null,
    })
  }

  visitErrorNode(_node: ErrorNode): void {
    // Do nothing
  }

  visitChain(node: Chain, context: visitorContext): void {
    this.visit(node.source, context);
    for (const mid of node.midSteps) {
      this.visit(mid, context);
    }
    this.visit(node.target, context);
    if (!this.expressionsType.get(node.source)?.canBeOutput) {
      this.errors.push({
        message: `Chain source should be an output`,
        span: node.source.span,
      });
    }
    for (const mid of node.midSteps) {
      if (!this.expressionsType.get(mid)?.canBeInput) {
        this.errors.push({
          message: `Chain mid step should be an input`,
          span: mid.span,
        });
      }
      if (!this.expressionsType.get(mid)?.canBeOutput) {
        this.errors.push({
          message: `Chain mid step should be an output`,
          span: mid.span,
        });
      }
    }
    if (!this.expressionsType.get(node.target)?.canBeInput) {
      this.errors.push({
        message: `Chain target should be an input`,
        span: node.target.span,
      });
    }
  }

  visitBinaryExpr(node: BinaryExpr, context: visitorContext): void {
    this.visit(node.left, context);
    this.visit(node.right, context);
    this.expressionsType.set(node, {
      canBeInput: false,
      canBeOutput: true,
      nodeClass: null,
    });
  }

  visitUnaryExpr(node: UnaryExpr, context: visitorContext): void {
    this.visit(node.expr, context);
    this.expressionsType.set(node, {
      canBeInput: false,
      canBeOutput: true,
      nodeClass: null,
    });
  }

  visitMappingExpr(node: MappingExpr, context: visitorContext): void {
    this.visit(node.source, context);
    this.visit(node.from, context);
    this.visit(node.to, context);
    if (!this.expressionsType.get(node.from)?.canBeOutput) {
      this.errors.push({
        message: `Mapping interval start should be an output`,
        span: node.from.span,
      });
    }
    if (!this.expressionsType.get(node.to)?.canBeOutput) {
      this.errors.push({
        message: `Mapping interval end should be an output`,
        span: node.to.span,
      });
    }
    this.expressionsType.set(node, {
      canBeInput: false,
      canBeOutput: true,
      nodeClass: null,
    });
  }

  visitConstConstruction(node: ConstConstruction, context: visitorContext): void {
    const className = node.className.name;
    const constName = node.name.name;
    const span = node.name.span;

    if (context.currentScope.has(constName)) {
      this.errors.push({
        message: `Identifier already defined in this scope: ${constName}`,
        span: node.name.span,
      });
      return;
    }

    const cls = this.resolveClass(className);
    const exprType: ExpressionTypeInfo = {
      canBeInput: canBeInput(cls),
      canBeOutput: canBeOutput(cls),
      nodeClass: cls,
    }
    const declaration: ConstDeclaration = {
      node,
      span,
    };
    const resolution: ConstResolution = {
      type: "const",
      expressionType: exprType,
      declaration,
    }
    if(constName !== "_") {
      context.currentScope.set(constName, resolution);
    }
    this.expressionsType.set(node, exprType);
    if (!cls) {
      this.errors.push({
        message: `Undefined class: ${className}`,
        span: node.className.span,
      });
      return;
    }
    this.visitArgs(node, cls, context);
  }

  visitConstruction(node: Construction, context: visitorContext): void {
    const className = node.className.name;
    const cls = this.resolveClass(className);
    this.expressionsType.set(node, {
      canBeInput: canBeInput(cls),
      canBeOutput: canBeOutput(cls),
      nodeClass: cls,
    });
    if (!cls) {
      this.errors.push({
        message: `Undefined class: ${className}`,
        span: node.className.span,
      });
      return;
    }
    this.visitArgs(node, cls, context);
  }

  visitConstDefinition(node: ConstDefinition, context: visitorContext): void {
    const constName = node.name.name;
    const span = node.name.span;

    if (constName === "_") {
      this.errors.push({
        message: `Identifier '_' cannot be defined as a constant`,
        span: node.name.span,
      });
      this.expressionsType.set(node, {
        canBeInput: false,
        canBeOutput: false,
        nodeClass: null,
      });
      return;
    }
    if (context.currentScope.has(constName)) {
      this.errors.push({
        message: `Identifier already defined in this scope: ${constName}`,
        span: node.name.span,
      });
      this.expressionsType.set(node, {
        canBeInput: false,
        canBeOutput: false,
        nodeClass: null,
      });
      return;
    }

    this.visit(node.value, context);
    const exprType = this.expressionsType.get(node.value)!;
    const declaration: ConstDeclaration = {
      node,
      span,
    };
    const resolution: ConstResolution = {
      type: "const",
      expressionType: exprType,
      declaration: declaration,
    }
    context.currentScope.set(constName, resolution);
    this.expressionsType.set(node, exprType);
  }

  visitSocketAccess(node: SocketAccess, context: visitorContext): void {
    this.expressionsType.set(node, {
      canBeInput: true,
      canBeOutput: false,
      nodeClass: null,
    });
    const objectIdentifier = node.object;
    const res = this.resolveIdentifier(objectIdentifier.name, context, objectIdentifier.span);
    if (!res) {
      this.errors.push({
        message: `Undefined identifier: ${objectIdentifier.name}`,
        span: objectIdentifier.span,
      });
      return;
    }
    if (!res.expressionType.nodeClass) {
      this.errors.push({
        message: `Only objects have sockets: ${objectIdentifier.name}`,
        span: objectIdentifier.span,
      });
      return;
    }
    const socketName = node.socket.name;
    if (!getSocket(res.expressionType.nodeClass, socketName)) {
      this.errors.push({
        message: `Undefined socket '${socketName}' for class '${res.expressionType.nodeClass.className}'`,
        span: node.socket.span,
      });
      return;
    }
  }

  visitOutputAccess(node: OutputAccess, context: visitorContext): void {
    this.expressionsType.set(node, {
      canBeInput: false,
      canBeOutput: true,
      nodeClass: null,
    })
    const objectIdentifier = node.object;
    const res = this.resolveIdentifier(objectIdentifier.name, context, objectIdentifier.span);
    if (!res) {
      this.errors.push({
        message: `Undefined identifier: ${objectIdentifier.name}`,
        span: objectIdentifier.span,
      });
      return;
    }
    if (!res.expressionType.nodeClass) {
      this.errors.push({
        message: `Only objects have outputs: ${objectIdentifier.name}`,
        span: objectIdentifier.span,
      });
      return;
    }
    const outputName = node.output.name;
    if (!getOutput(res.expressionType.nodeClass, outputName)) {
      this.errors.push({
        message: `Undefined output '${outputName}' for class '${res.expressionType.nodeClass.className}'`,
        span: node.output.span,
      });
      return;
    }
  }

  visitConstAccess(node: ConstAccess, context: visitorContext): void {
    const objectIdentifier = node.name;
    const res = this.resolveIdentifier(objectIdentifier.name, context, objectIdentifier.span);
    if (!res) {
      this.errors.push({
        message: `Undefined identifier: ${objectIdentifier.name}`,
        span: objectIdentifier.span,
      });
      this.expressionsType.set(node, {
        canBeInput: false,
        canBeOutput: false,
        nodeClass: null,
      });
      return;
    }
    this.expressionsType.set(node, res.expressionType);
  }

  resolveIdentifier(name: string, context: visitorContext, span: Span): IdentifierResolution | null {
    if(name === "_") {
      this.errors.push({
        message: `Identifier '_' cannot be accessed`,
        span: span,
      });
    }
    for (const scope of context.accessibleScopes) {
      if (scope.has(name)) {
        return scope.get(name)!;
      }
    }
    return null;
  }

  resolveClass(name: string): SoundNodeClassInfo | null {
    return this.resolvedClasses.get(name) ?? null;
  }

  visitArgs(node: ConstConstruction | Construction, cls: SoundNodeClassInfo, context: visitorContext): void {
    const className = node.className.name;
    const maxPositionArgs = cls.positionalArgs?.length ?? 0;
    const positionArgsCount = node.args.length;
    if (positionArgsCount > maxPositionArgs) {
      this.errors.push({
        message: `Too many positional arguments for ${className}: expected at most ${maxPositionArgs}, got ${positionArgsCount}`,
        span: node.span,
      });
    }
    let satisfiedSockets: string[] = [];
    for (let i = 0; i < Math.min(maxPositionArgs, positionArgsCount); i++) {
      this.visit(node.args[i], context);
      if (!this.expressionsType.get(node.args[i].value)?.canBeOutput) {
        this.errors.push({
          message: `Argument ${i + 1} for ${className} should be an output`,
          span: node.args[i].span,
        });
      }
      satisfiedSockets.push(getSocket(cls, cls.positionalArgs![i])!);
    }
    for (const kwarg of node.kwargs) {
      this.visit(kwarg, context);
      const socketName = kwarg.name.name;
      if (!this.expressionsType.get(kwarg.value)?.canBeOutput) {
        this.errors.push({
          message: `Keyword argument ${socketName} for ${className} should be an output`,
          span: kwarg.span,
        });
      }
      const socket = getSocket(cls, socketName);
      if (!socket) {
        this.errors.push({
          message: `Class ${className} has no socket named ${socketName}`,
          span: kwarg.name.span,
        });
        continue;
      }
      if (satisfiedSockets.includes(socket)) {
        this.errors.push({
          message: `Socket ${socketName} for class ${className} previously assigned`,
          span: kwarg.name.span,
        });
      }
    }
  }
}
