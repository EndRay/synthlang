import {RangeSetBuilder} from "@codemirror/state";
import {Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate,} from "@codemirror/view";
import {Token} from "../language/tokens";
import {Parser} from "../language/Parser";
import {
  ConstAccess,
  ConstConstruction,
  ConstDefinition, Construction,
  Identifier,
  KeywordArg,
  OutputAccess,
  SocketAccess
} from "../language/ast";
import {IdentifierResolution, Resolver} from "../language/Resolver";
import {LeafsCollector} from "./LeafsCollector";
import {SoundNodeClassInfo} from "../language/SoundNodeClassInfo";
import {CLASSES_LIST} from "../language/classes";
import {Lexer} from "../language/Lexer";
import {IRBuilder} from "../language/IRBuilder";

type TokenClass =
  | "tok-keyword"
  | "tok-operator"
  | "tok-identifier"
  | "tok-number"
  | "tok-string"
  | "tok-punct"
  | "tok-unit";

function cssClassForToken(t: Token): TokenClass | null {
  switch (t.type) {
    case "keyword":
      return "tok-keyword";
    case "operator":
      return "tok-operator";
    // case "identifier":
    //   return "tok-identifier";
    case "number":
      return "tok-number";
    case "string":
      return "tok-string";
    case "punctuation":
      return "tok-punct";
    default:
      return null;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const docText = view.state.doc.toString();
  const lexResult = new Lexer(docText).lex();
  const parseResult = new Parser(lexResult).parse();
  const resolveResult = new Resolver(parseResult, CLASSES_LIST).resolve();

  const {tokens} = lexResult;

  const ranges: { from: number; to: number; deco: Decoration }[] = [];

  // Token decorations
  for (const tok of tokens) {
    if (tok.type === "number" && tok.unit) {
      const unitStart = tok.span.end - tok.unit.length;
      ranges.push({
        from: tok.span.start,
        to: unitStart,
        deco: Decoration.mark({class: "tok-number"}),
      });
      ranges.push({
        from: unitStart,
        to: tok.span.end,
        deco: Decoration.mark({class: "tok-unit"}),
      });
    } else {
      const cssClass = cssClassForToken(tok)
      if (!cssClass) continue;
      ranges.push({
        from: tok.span.start,
        to: tok.span.end,
        deco: Decoration.mark({class: cssClass}),
      });
    }
  }

  const leafsCollector = new LeafsCollector();
  leafsCollector.collectLeafs(parseResult.ast);

  function resolveIdentifier(name: string, scope: "global" | "voice"): {
    resolution: IdentifierResolution | null,
    resolutionScope: "global" | "voice"
  } {
    const g = resolveResult.globalScope;
    const v = resolveResult.voiceScope;
    if (scope === "global") {
      return {resolution: g.get(name) ?? null, resolutionScope: "global"};
    } else {
      if (v.has(name)) return {
        resolution: v.get(name)!,
        resolutionScope: "voice"
      }
      return {resolution: g.get(name) ?? null, resolutionScope: "global"}
    }
  }

  function resolveClass(name: string): SoundNodeClassInfo | null {
    for (const cls of CLASSES_LIST) {
      if (cls.className === name) return cls;
    }
    return null;
  }

  function pushConstIdentifier(name: Identifier, scope: "global" | "voice") {
    const constName = name.name;
    const {resolution} = resolveIdentifier(constName, scope);
    const cssClass =
      !resolution ?
        "tok-unresolved" :
        (resolution.type === "const" ?
          "tok-const" : "tok-builtin");
    const classGroup = resolution?.expressionType?.nodeClass?.classGroup
    const cssClassForClass = classGroup ? "tok-known-class tok-class-" + classGroup : ""
    ranges.push({
      from: name.span.start,
      to: name.span.end,
      deco: Decoration.mark({class: cssClass + " " + cssClassForClass}),
    });
  }

  for (const {node, scope} of leafsCollector.leafs) {
    switch (node.type) {
      case "ConstAccess": {
        pushConstIdentifier((node as ConstAccess).name, scope);
        break;
      }
      case "SocketAccess":
        const sa = node as SocketAccess;
        pushConstIdentifier(sa.object, scope);
        ranges.push({
          from: sa.socket.span.start,
          to: sa.socket.span.end,
          deco: Decoration.mark({class: "tok-socket"}),
        });
        break;
      case "OutputAccess":
        const oa = node as OutputAccess;
        pushConstIdentifier(oa.object, scope);
        ranges.push({
          from: oa.output.span.start,
          to: oa.output.span.end,
          deco: Decoration.mark({class: "tok-output"}),
        });
        break;
      case "ConstDefinition": {
        const cd = node as ConstDefinition
        ranges.push({
          from: cd.name.span.start,
          to: cd.name.span.end,
          deco: Decoration.mark({class: "tok-constdef"}),
        });
        break;
      }
      case "ConstConstruction": {
        const cons = node as ConstConstruction;
        const cls = resolveClass(cons.className.name)
        const cssClassForClass = cls ? "tok-class-" + cls.classGroup : ""
        ranges.push({
          from: cons.className.span.start,
          to: cons.className.span.end,
          deco: Decoration.mark({class: "tok-class " + cssClassForClass}),
        })
        ranges.push({
          from: cons.name.span.start,
          to: cons.name.span.end,
          deco: Decoration.mark({class: "tok-constdef"}),
        });
        break;
      }
      case "Construction": {
        const c = node as Construction;
        const cls = resolveClass(c.className.name)
        const cssClassForClass = cls ? "tok-class-" + cls.classGroup : ""
        ranges.push({
          from: c.className.span.start,
          to: c.className.span.end,
          deco: Decoration.mark({class: "tok-class " + cssClassForClass}),
        })
        break;
      }
      case "KeywordArg":
        const ka = node as KeywordArg;
        ranges.push({
          from: ka.name.span.start,
          to: ka.name.span.end,
          deco: Decoration.mark({class: "tok-socket"}),
        });
        break;
    }
  }

  // Sorting by start position is mandatory for RangeSetBuilder
  ranges.sort((a, b) => a.from - b.from);

  // Add in order
  for (const r of ranges) builder.add(r.from, r.to, r.deco);

  return builder.finish();
}

export const myLanguageHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
