import {
  ConstantNumber,
  ExpressionSum,
  ExpressionValue,
  ObjectExpression,
  ObjectOutput,
  ObjectSocket, StructureObject,
  SynthStructure
} from "./SynthStructure";
import {ResolveResult} from "./Resolver";
import {Span} from "./Span";
import {
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
import {SoundNodeClassInfo} from "./SoundNodeClassInfo";
import {
  AttenuatorClass, BipolarMappingClass,
  InverterClass, KnobClass,
  MappingClass,
  UserInput,
  UserOutput,
  UserStereoInput,
  UserStereoOutput
} from "./classes";
import {GLOBAL_BUILTIN, VOICE_BUILTIN} from "./builtin";

export interface InterpretationError {
  message: string
  span: Span;
}

export interface IRBuilderResult {
  structure: SynthStructure | null;
  interpretationErrors: InterpretationError[];
  interpretationWarnings: InterpretationError[];
}

interface BuilderContext {
  isVoice: boolean;
}

export interface IRBuilderConfig {
  removeSpans?: boolean;
  removeAliases?: boolean;
}

const DEFAULT_IR_BUILDER_CONFIG: IRBuilderConfig = {
  removeSpans: true,
  removeAliases: true,
}

export class IRBuilder implements ASTNodeVisitor<BuilderContext, ExpressionValue<true>> {
  visit = visitImplementation<BuilderContext, ExpressionValue<true>>;

  private readonly ast: Program;
  private resolvedClasses: Map<string, SoundNodeClassInfo>;
  private objects: StructureObject<true>[] = [];
  private globalConstNameToValue: Map<string, ExpressionValue<true>> = new Map();
  private voiceConstNameToValue: Map<string, ExpressionValue<true>> = new Map();

  private interpretationErrors: InterpretationError[] = [];
  private interpretationWarnings: InterpretationError[] = [];

  private readonly config: IRBuilderConfig;

  constructor(resolveResult: ResolveResult, config?: IRBuilderConfig) {
    this.ast = resolveResult.ast;
    this.resolvedClasses = new Map<string, SoundNodeClassInfo>(resolveResult.resolvedClasses);
    this.config = {...DEFAULT_IR_BUILDER_CONFIG, ...config};
  }

  build(): IRBuilderResult {
    const userInputNames: string[] = [];
    const userPerVoiceInputNames: string[] = [];
    const userOutputNames: string[] = [];

    const userCustomInputNames: string[] = [];
    const userCustomInputIds: number[] = [];

    const totalBuiltInObjects = () => userInputNames.length + userOutputNames.length + userPerVoiceInputNames.length;

    this.resolvedClasses.set(UserInput.className, UserInput);
    this.resolvedClasses.set(UserOutput.className, UserOutput);
    this.resolvedClasses.set(UserStereoInput.className, UserStereoInput);
    this.resolvedClasses.set(UserStereoOutput.className, UserStereoOutput);

    for (const [builtinName, builtinClass] of GLOBAL_BUILTIN.entries()) {
      if (builtinClass === UserInput || builtinClass === UserStereoInput) {
        userInputNames.push(builtinName);
        const objectId = this.createObject(builtinClass.className, false, {start: -1, end: -1});
        this.setConst(builtinName, {
          type: "ObjectExpression",
          span: {start: -1, end: -1},
          objectId,
        }, false);
      }
    }
    for (const [builtinName, builtinClass] of GLOBAL_BUILTIN.entries()) {
      if (builtinClass === UserOutput || builtinClass === UserStereoOutput) {
        userOutputNames.push(builtinName);
        const objectId = this.createObject(builtinClass.className, false, {start: -1, end: -1});
        this.setConst(builtinName, {
          type: "ObjectExpression",
          span: {start: -1, end: -1},
          objectId,
        }, false);
      }
    }
    for (const [builtinName, builtinClass] of VOICE_BUILTIN.entries()) {
      if (builtinClass === UserInput || builtinClass === UserStereoInput) {
        userPerVoiceInputNames.push(builtinName);
        const objectId = this.createObject(builtinClass.className, true, {start: -1, end: -1});
        this.setConst(builtinName, {
          type: "ObjectExpression",
          span: {start: -1, end: -1},
          objectId,
        }, true);
      }
    }
    for (const [_builtinName, builtinClass] of VOICE_BUILTIN.entries()) {
      if (builtinClass === UserOutput || builtinClass === UserStereoOutput) {
        throw new Error("Voice-level outputs are not supported");
      }
    }

    for (const line of this.ast.lines) {
      this.visit(line.statement, {isVoice: line.isVoice});
    }

    for(const [constName, constValue] of this.globalConstNameToValue.entries()) {
      if(constValue.type === "ObjectExpression" && this.objects[constValue.objectId].className === KnobClass.className) {
        userCustomInputNames.push(constName);
        userCustomInputIds.push(constValue.objectId);
      }
    }

    for(const [constName, constValue] of this.voiceConstNameToValue.entries()) {
      if(constValue.type === "ObjectExpression" && this.objects[constValue.objectId].className === KnobClass.className) {
        this.interpretationErrors.push({
          message: "Voice-level custom inputs are not supported",
          span: constValue.span!,
        });
      }
    }

    const recalculationOrder = this.defineOrder(this.getConst("output", false)! as ObjectExpression);

    for (let i = totalBuiltInObjects(); i < this.objects.length; i++) {
      if (!recalculationOrder.includes(i)) {
        this.interpretationWarnings.push({
          message: "Unconnected object will not be processed",
          span: this.objects[i].span,
        });
      }
    }

    let finalObjects: StructureObject<false>[] = this.objects.map(obj => ({...obj}));

    if (this.config.removeSpans) {
      for (const obj of finalObjects) {
        for (const [_socketName, mixes] of obj.socketMixes.entries()) {
          for (const mix of mixes) {
            delete mix.span;
          }
        }
      }
    }

    if (this.config.removeAliases) {
      for (const obj of finalObjects) {
        const cls = this.resolvedClasses.get(obj.className)!;
        for (const socket of cls.sockets) {
          if (typeof socket !== "string") {
            for (const alias of socket.slice(1)) {
              obj.socketMixes.delete(alias);
            }
          }
        }
      }
    }

    return {
      structure: this.interpretationErrors.length === 0 ? {
        userInputNames, userPerVoiceInputNames, userOutputNames,
        userCustomInputNames, userCustomInputIds,
        objects: finalObjects,
        recalculationOrder,
      } : null,
      interpretationErrors: this.interpretationErrors,
      interpretationWarnings: this.interpretationWarnings,
    }
  }

  defineOrder(obj: ExpressionValue | ObjectExpression, waitingObjects: number[] = [], result: number[] = []): number[] {
    switch (obj.type) {
      case "ObjectOutput":
      case "ObjectExpression": {
        if (waitingObjects.includes(obj.objectId)) {
          this.interpretationErrors.push({
            message: "Cyclic dependency detected",
            span: obj.span!, // TODO: make span cover chain
          });
          return [];
        }
        waitingObjects.push(obj.objectId);
        for (const dep of this.objects[obj.objectId].socketMixes.values()) {
          for (const val of dep) {
            this.defineOrder(val, waitingObjects, result);
          }
        }
        waitingObjects.pop();
        if (!result.includes(obj.objectId))
          result.push(obj.objectId);
        return result;
      }
      case "ConstantNumber": {
        return [];
      }
    }
  }

  visitProgram(_node: Program): ExpressionValue<true> {
    throw new Error("IRBuilder should not visit Program node directly");
  }

  visitChain(node: Chain, context: BuilderContext) {
    let last = this.visit(node.source, context);
    for (const mid of [...node.midSteps, node.target]) {
      let current = this.visit(mid, context);
      switch (current.type) {
        case "ObjectExpression": {
          if (this.hasMonoInput(current)) {
            this.connectMono(last, current);
          } else if (this.hasStereoInput(current)) {
            this.connectStereo(last, current);
          } else {
            this.interpretationErrors.push({
              message: "Incompatible connection in chain",
              span: mid.span,
            });
          }
          break;
        }
        case "ObjectSocket": {
          this.connectToSocket(current.objectId, current.socketName, last);
          break;
        }
        default: {
          this.interpretationErrors.push({
            message: "Incompatible connection in chain",
            span: mid.span,
          });
          return this.dummy();
        }
      }
      last = current;
    }
    return this.dummy();

  }

  hasMonoInput(obj: ObjectExpression): boolean {
    const objectClassName = this.objects[obj.objectId].className;
    const cls = this.resolvedClasses.get(objectClassName)!;
    return cls.sockets.includes("input"); // TODO: SOCKET ALIASES!!!
  }

  hasStereoInput(obj: ObjectExpression): boolean {
    const objectClassName = this.objects[obj.objectId].className;
    const cls = this.resolvedClasses.get(objectClassName)!;
    return cls.sockets.includes("left") && cls.sockets.includes("right");
  }

  connectMono(source: ExpressionValue<true>, target: ObjectExpression) {
    this.connectToSocket(target.objectId, "input", source);
  }

  connectStereo(source: ExpressionValue<true>, target: ObjectExpression) {
    this.connectToSocket(target.objectId, "left", source, "left");
    this.connectToSocket(target.objectId, "right", source, "right");
  }


  visitConstruction(node: Construction, context: BuilderContext): ObjectExpression {
    const objectId = this.constructObject(node.className.name, node.args, node.kwargs, context, node.span);
    return {
      type: "ObjectExpression",
      span: node.span,
      objectId,
    };
  }

  visitConstConstruction(node: ConstConstruction, context: BuilderContext) {
    const objectId = this.constructObject(node.className.name, node.args, node.kwargs, context, node.span);
    const expression: ObjectExpression = {
      type: "ObjectExpression",
      span: node.span,
      objectId,
    };
    this.setConst(node.name.name, expression, context.isVoice);
    return expression;
  }

  constructObject(className: string, args: PositionalArg[], kwargs: KeywordArg[], context: BuilderContext, span: Span): number {
    const cls = this.resolvedClasses.get(className)!; // should be resolved already
    const objectId = this.createObject(cls.className, context.isVoice, span);
    for (const [i, arg] of args.entries()) {
      const socketName = cls.positionalArgs![i];
      let socketValue = this.visit(arg, context);
      this.connectToSocket(objectId, socketName, socketValue);
    }
    for (const kwarg of kwargs) {
      const socketName = kwarg.name.name;
      let socketValue = this.visit(kwarg, context);
      this.connectToSocket(objectId, socketName, socketValue);
    }
    return objectId;
  }

  visitConstDefinition(node: ConstDefinition, context: BuilderContext): ExpressionValue<true> {
    const expression: ExpressionValue<true> = this.visit(node.value, context);
    this.setConst(node.name.name, expression, context.isVoice);
    return expression;
  }

  visitConstAccess(node: ConstAccess, context: BuilderContext) {
    return this.getConst(node.name.name, context.isVoice)!;
  }

  visitSocketAccess(node: SocketAccess, context: BuilderContext): ObjectSocket {
    const objectExpression: ObjectExpression = (this.getConst(node.object.name, context.isVoice)! as ObjectExpression);
    return {
      type: "ObjectSocket",
      span: node.span,
      objectId: objectExpression.objectId,
      socketName: node.socket.name,
    };

  }

  visitOutputAccess(node: OutputAccess, context: BuilderContext): ObjectOutput {
    const objectExpression: ObjectExpression = (this.getConst(node.object.name, context.isVoice)! as ObjectExpression);
    return {
      type: "ObjectOutput",
      span: node.span,
      objectId: objectExpression.objectId,
      outputName: node.output.name,
    };
  }

  connectToSocket(objectId: number, socketName: string, socketValue: ExpressionValue<true>, preferableOutput?: string) {
    if (socketValue.type === "ObjectExpression") {
      let outputName = "output"
      if(preferableOutput) {
        const sourceObjectClassName = this.objects[socketValue.objectId].className;
        const sourceCls = this.resolvedClasses.get(sourceObjectClassName)!;
        if(sourceCls.outputs.includes(preferableOutput)) {
          outputName = preferableOutput;
        }
      }
      socketValue = {
        type: "ObjectOutput",
        span: socketValue.span,
        objectId: socketValue.objectId,
        outputName,
      } // ! stereo sockets do not exist right now
    }
    if (socketValue.type === "ObjectSocket") {
      throw new Error("Trying to assign socket to socket") // This should have been caught on earlier stage
    }
    if (socketValue.type === "ExpressionSum") {
      for (const val of socketValue.values) {
        this.connectToSocket(objectId, socketName, val);
      }
    } else {
      const socketMix = this.objects[objectId].socketMixes.get(socketName);
      if (!socketMix) {
        console.log("Unknown socket:", socketName, "for object:", this.objects[objectId]); // TODO: This should not happen
      } else {
        socketMix.push(socketValue);
      }
    }
  }

  visitPositionalArg(node: PositionalArg, context: BuilderContext): ExpressionValue<true> {
    return this.visit(node.value, context);
  }

  visitKeywordArg(node: KeywordArg, context: BuilderContext): ExpressionValue<true> {
    return this.visit(node.value, context);
  }

  visitMappingExpr(node: MappingExpr, context: BuilderContext): ObjectOutput {
    const objectId = this.createObject(
      node.kind ? MappingClass.className : BipolarMappingClass.className,
      context.isVoice, node.span);
    const sourceValue = this.visit(node.source, context);
    const fromValue = this.visit(node.from, context);
    const toValue = this.visit(node.to, context);
    this.connectToSocket(objectId, "source", sourceValue);
    this.connectToSocket(objectId, "from", fromValue);
    this.connectToSocket(objectId, "to", toValue);
    return {
      type: "ObjectOutput",
      span: node.span,
      objectId,
      outputName: "output",
    }
  }

  visitUnaryExpr(node: UnaryExpr, context: BuilderContext): ExpressionValue<true> {
    const expression = this.visit(node.expr, context);
    switch (node.op) {
      case "+": {
        return expression;
      }
      case "-": {
        const inverterId = this.createObject(InverterClass.className, context.isVoice, node.span);
        this.connectToSocket(inverterId, "input", expression);
        return {
          type: "ObjectOutput",
          span: node.span,
          objectId: inverterId,
          outputName: "output",
        }
      }
    }
  }

  visitBinaryExpr(node: BinaryExpr, context: BuilderContext): ObjectOutput | ExpressionSum {
    const left = this.visit(node.left, context);
    const right = this.visit(node.right, context);
    switch (node.op) {
      case "+": {
        return {
          type: "ExpressionSum",
          values: [left, right],
        }
      }
      case "-": {
        const inverterId = this.createObject(InverterClass.className, context.isVoice, node.span);
        this.connectToSocket(inverterId, "input", right);
        return {
          type: "ExpressionSum",
          values: [left, {
            type: "ObjectOutput",
            span: node.right.span,
            objectId: inverterId,
            outputName: "output",
          }],
        }
      }
      case "*": {
        const objectId = this.createObject(AttenuatorClass.className, context.isVoice, node.span);
        this.connectToSocket(objectId, "input", left);
        this.connectToSocket(objectId, "amount", right);
        return {
          type: "ObjectOutput",
          span: node.span,
          objectId,
          outputName: "output",
        }
      }
    }
  }

  visitNumberLiteral(node: NumberLiteral): ConstantNumber {
    return {
      type: "ConstantNumber",
      span: node.span,
      value: node.value,
      unit: node.unit ?? "",
    };
  }

  visitErrorNode(_node: ErrorNode): ExpressionValue<true> {
    throw new Error("IRBuilder should not see ErrorNodes");
  };

  visitIdentifier(_node: Identifier): ExpressionValue<true> {
    throw new Error("IRBuilder should not see Identifier directly");
  }

  createObject(className: string, perVoice: boolean, span: Span): number {
    const objId = this.objects.length;
    const socketMixes = new Map<string, ExpressionValue[]>();
    const cls = this.resolvedClasses.get(className)!;
    if (!cls) {
      throw new Error("Trying to create object of unknown class: " + className);
    }
    for (const socketName of cls.sockets) {
      if (typeof socketName === "string") {
        socketMixes.set(socketName, []);
      } else {
        let commonArray: [] = [];
        for (const alias of socketName) {
          socketMixes.set(alias, commonArray);
        }
      }
    }
    this.objects.push({
      className,
      perVoice,
      socketMixes,
      span
    });
    return objId;
  }

  setConst(name: string, value: ExpressionValue<true>, isVoice: boolean) {
    if (name === "_") {
      return;
    }
    const constMap =
      isVoice ? this.voiceConstNameToValue : this.globalConstNameToValue;
    constMap.set(name, value);
  }

  getConst(name: string, isVoice: boolean): ExpressionValue<true> | undefined {
    if (isVoice) {
      if (this.voiceConstNameToValue.has(name)) {
        return this.voiceConstNameToValue.get(name);
      }
    }
    return this.globalConstNameToValue.get(name);
  }

  dummy(): ExpressionValue<true> {
    return {type: "ConstantNumber", span: {start: -1, end: -1}, value: -1, unit: ""};
  }
}