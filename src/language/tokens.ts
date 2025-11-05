import {Span} from "./Span";

export type TokenType =
  | "keyword"
  | "operator"
  | "identifier"
  | "number"
  | "string"
  | "punctuation";

export interface Token {
  type: TokenType;
  span: Span;
  value: string;

  numberValue?: number; // only for number tokens
  unit?: string;      // only for number tokens
}

export interface LexicalError {
  message: string;
  span: Span;
}

export interface LexResult {
  tokens: Token[];
  lexicalErrors: LexicalError[];
}