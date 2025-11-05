import {Diagnostic, linter} from "@codemirror/lint";
import {Parser} from "../language/Parser";
import {Resolver} from "../language/Resolver";
import {CLASSES_LIST} from "../language/classes";
import {Lexer} from "../language/Lexer";
import {InterpretationError, IRBuilder} from "../language/IRBuilder";

export const myLanguageLinter = linter((view) => {
  const doc = view.state.doc;
  const lexResult = new Lexer(doc.toString()).lex();
  const parseResult = new Parser(lexResult).parse();
  const resolveResult = new Resolver(parseResult, CLASSES_LIST).resolve();
  const {lexicalErrors} = lexResult;
  const {syntaxErrors} = parseResult;
  const {semanticErrors} = resolveResult;

  let interpretationErrors: InterpretationError[] = [];
  let interpretationWarnings: InterpretationError[] = [];
  if (lexicalErrors.length === 0 && syntaxErrors.length === 0 && semanticErrors.length === 0) {
    const builderResult = new IRBuilder(resolveResult).build();
    console.log(builderResult);
    interpretationErrors = builderResult.interpretationErrors;
    interpretationWarnings = builderResult.interpretationWarnings;
  }

  const syntaxDiagnostics: Diagnostic[] = syntaxErrors.map((err) => {
    const from = err.span.start;
    const to = Math.max(err.span.end, err.span.start + 1);

    if(from === -1) {
      return {
        from: doc.length, to: doc.length,
        severity: "error",
        message: `Syntax Error: ${err.message}`,
      }
    }

    const startLine = doc.lineAt(err.span.start);
    const line = startLine.number;                  // 1-based
    const col = err.span.start - startLine.from + 1;      // 1-based

    return {
      from, to,
      severity: "error",
      message: `Syntax Error at line ${line}, col ${col}: ${err.message}`,
    };
  });

  const semanticDiagnostics: Diagnostic[] = semanticErrors.map((err) => {
    const startLine = doc.lineAt(err.span.start);
    const line = startLine.number;                  // 1-based
    const col = err.span.start - startLine.from + 1;      // 1-based
    const to = Math.max(err.span.end, err.span.start + 1);

    return {
      from: err.span.start,
      to,
      severity: "error",
      message: `Semantic Error at line ${line}, col ${col}: ${err.message}`,
    };
  });

  const interpretationDiagnostics: Diagnostic[] = interpretationErrors.map((err): Diagnostic => {
    const from = err.span.start;
    const to = Math.max(err.span.end, err.span.start + 1);
    if (from == -1) {
      return {
        from: 0, to: 0,
        severity: "error",
        message: `Interpretation Error: ${err.message}`,
      }
    }

    const startLine = doc.lineAt(err.span.start);
    const line = startLine.number;                  // 1-based
    const col = err.span.start - startLine.from + 1;      // 1-based

    return {
      from, to,
      severity: "error",
      message: `Interpretation Error at line ${line}, col ${col}: ${err.message}`,
    };
  }).concat(interpretationWarnings.map((warn):Diagnostic => {
    const from = warn.span.start;
    const to = Math.max(warn.span.end, warn.span.start + 1);
    if (from == -1) {
      return {
        from: 0, to: 0,
        severity: "error",
        message: `Interpretation Warning: ${warn.message}`,
      }
    }

    const startLine = doc.lineAt(warn.span.start);
    const line = startLine.number;                  // 1-based
    const col = warn.span.start - startLine.from + 1;      // 1-based

    return {
      from, to,
      severity: "warning",
      message: `Interpretation Warning at line ${line}, col ${col}: ${warn.message}`,
      markClass: "cm-diagnostic-unused",
    };
  }));

  return [...syntaxDiagnostics, ...semanticDiagnostics, ...interpretationDiagnostics];
});