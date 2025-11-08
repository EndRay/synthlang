import {Span} from "./Span";

export interface ObjectOutput {
  type: "ObjectOutput",
  span?: Span;
  objectId: number,
  outputName: string,
}

export interface ObjectSocket {
  type: "ObjectSocket",
  span?: Span;
  objectId: number,
  socketName: string,
}

export interface ObjectExpression {
  type: "ObjectExpression",
  span?: Span;
  objectId: number,
}

export interface ConstantNumber {
  type: "ConstantNumber",
  span?: Span;
  value: number,
  unit: string,
}

export interface ExpressionSum {
  type: "ExpressionSum",
  span?: Span;
  values: ExpressionValue<true>[],
}

export type ExpressionValue<allowUnfinished = false> =
  | ObjectOutput
  | ConstantNumber
  | (allowUnfinished extends true ? ObjectExpression : never)
  | (allowUnfinished extends true ? ObjectSocket : never)
  | (allowUnfinished extends true ? ExpressionSum : never);

export interface StructureObject<requireSpans> {
  className: string,
  perVoice: boolean,
  socketMixes: Map<string, ExpressionValue[]> // socket name -> expressions
  span: requireSpans extends true ? Span : Span | undefined;
}

/**
 * Order or objects is:
 * - Global User Inputs
 * - Global User Outputs
 * - Voice User Inputs
 * - Other objects
 */

export interface SynthStructure {
  userInputNames: string[],
  userOutputNames: string[],
  userPerVoiceInputNames: string[],
  userCustomInputNames: string[],
  userCustomInputIds: number[],
  objects: StructureObject<false>[],
  recalculationOrder: number[],
}