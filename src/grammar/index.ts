// Generated automatically by nearley, version unknown
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var semi: any;
declare var lparen: any;
declare var rparen: any;
declare var dot: any;
declare var lbracket: any;
declare var rbracket: any;
declare var kw_if: any;
declare var kw_else: any;
declare var identifier: any;
declare var string: any;
declare var lparen: any;
declare var rparen: any;
declare var minus: any;
declare var float: any;
declare var base2: any;
declare var base8: any;
declare var base16: any;
declare var base10: any;
declare var infinity: any;
declare var lparen: any;
declare var rparen: any;
declare var power: any;
declare var divide: any;
declare var times: any;
declare var plus: any;
declare var minus: any;
declare var equals: any;
declare var colon: any;
declare var lparen: any;
declare var rparen: any;
declare var colon: any;
declare var lbrace: any;
declare var rbrace: any;
declare var comma: any;
declare var concat: any;
declare var equals: any;
declare var leq: any;
declare var lt: any;

  import * as moo from "moo";

  import { Type } from "./../data";
  import {
    Expression, ExpressionKind
  } from "./../expression";

  /** Returns a Nearley parser postprocess function which returns
   * `d[index0][index1][index2][...][indexN]`. */
  function dn(index0: number, ...indices: number[]) {
    return function (d) {
      let value = d[index0];
      for (const index of indices)
        value = value[index];
      return value;
    };
  }

  function relocateSource(from, to) {
    from.col = to.col;
    from.line = to.line;
    from.offset = to.offset;
    return from;
  }

  function getTypeByName(name: string): Type {
    switch (name) {
      case "number":
        return Type.Number;
      case "string":
        return Type.String;
      default:
        throw new Error("Unknown type " + name);
    }
  }

  // Some tokens have `as any` because Nearley-to-Typescript doesn't like it otherwise.
  const lex = moo.compile({
    identifier: {
      match: /[a-zA-Z_][a-zA-Z0-9_]*/,
      type: moo.keywords({
        "kw_if": "if",
        "kw_else": "else"
      })
    },
    float: /[0-9]+\.[0-9]+/,
    base2: /0b[0-1]+/,
    base8: /0c[0-7]+/,
    base16: /0x[0-9A-Fa-f]+/,
    base10: {
      match: /0|[1-9][0-9]*/ as any,
      value: (x) => Number.parseInt(x, 10) as any
    },
    string: {
      match: /"(?:\\["\\ntbfr]|[^"\\])*"/,
      lineBreaks: true,
      value: (x) => x.substring(1, x.length - 1)
    },

    comma: ",",
    concat: "..",
    divide: "/",
    equals: "=",
    minus: "-",
    plus: "+",
    power: "**",
    times: "*",
    dot: ".",
    colon: ":",
    semi: ";",

    eq: "==",
    neq: "!=",
    leq: "<=",
    lt: "<",

    lbracket: "[",
    rbracket: "]",
    lbrace: "{",
    rbrace: "}",
    lparen: "(",
    rparen: ")",

    infinity: "\u221E",

    ws: {
      match: /[ \n\t]+/,
      lineBreaks: true
    }
  });


  function basePrefixToBase(prefix) {
    switch (prefix[prefix.length - 1]) {
      case "b": return 2;
      case "c": return 8;
      case "x": return 16;
      default: return undefined;
    }
    //return prefix.endsWith("b")
    //  ? prefix.substring(0, prefix.length - 1)
    //  : prefix;
  }

  function newNumberToken() {}

  function getNumberTokenValue(token) {
    const value = token.value.substring(2);

    switch (token.value.substring(0, 2)) {
      case "0b": return Number.parseInt(value, 2);
      case "0c": return Number.parseInt(value, 8);
      case "0x": return Number.parseInt(value, 16);
    }
    return Number.parseInt(value, 10);
  }

  function getNumberTokenBase(token) {

  }


  function newArithmeticExprToken(kind: ExpressionKind) {
    return function (d) {
      const token = ({
        "lhs": d[0],
        "rhs": d[4],
        kind
      });

       if (token.lhs.type===Type.Number && token.rhs.type===Type.Number) {
         return doArithmeticTokenExpression(token);
       }

      return token;
    };
  }

  function doArithmeticTokenExpression(token): any {
    let value;

    switch (token.kind) {
      case ExpressionKind.Add:
        value = token.lhs.value + token.rhs.value;
        break;
      case ExpressionKind.Subtract:
        value = token.lhs.value - token.rhs.value;
        break;
      case ExpressionKind.Divide:
        value = token.lhs.value / token.rhs.value;
        break;
      case ExpressionKind.Multiply:
        value = token.lhs.value * token.rhs.value;
        break;
      case ExpressionKind.Exponential:
        value = token.lhs.value ** token.rhs.value;
        break;
      default:
        throw new Error("Unknown op " + token.kind)
    }

    return ({
      kind: ExpressionKind.Number,
      type: Type.Number,
      value
    });
  }


  function newBinaryOpToken(kind: ExpressionKind) {
    return function (d) {
      const token = ({
        "lhs": d[0],
        "rhs": d[5], // TODO THIS SHOULD NOT BE 5
        kind
      });

      if (token.lhs.constant && token.rhs.constant)
        return doBinaryOpToken(token);
      return token;
    };
  }

  function doBinaryOpToken(token): any {
    let value;

    switch (token.kind) {
      case ExpressionKind.Equal:
        value = token.lhs.value === token.rhs.value;
        break;
      default:
        throw new Error("Idk that op " + token.kind)
    }

    return ({
      "kind": ExpressionKind.Any,
      "constant": true,
      value
    });
  }

export interface Token { value: any; [key: string]: any };

export interface Lexer {
  reset: (chunk: string, info: any) => void;
  next: () => Token | undefined;
  save: () => any;
  formatError: (token: Token) => string;
  has: (tokenType: string) => boolean
};

export interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any
};

export type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

export var Lexer: Lexer | undefined = lex;

export var ParserRules: NearleyRule[] = [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "Chunk", "symbols": ["_", "Expr", "_"], "postprocess": (d) => [d[1]]},
    {"name": "Chunk", "symbols": ["Chunk", "_", (lex.has("semi") ? {type: "semi"} : semi), "_", "Expr", "_"], "postprocess": (d) => [...d[0], d[4]]},
    {"name": "Expr$subexpression$1", "symbols": ["ArithmeticExpr"]},
    {"name": "Expr$subexpression$1", "symbols": ["AssignExpr"]},
    {"name": "Expr$subexpression$1", "symbols": ["DeclareExpr"]},
    {"name": "Expr$subexpression$1", "symbols": ["IfExpr"]},
    {"name": "Expr$subexpression$1", "symbols": ["ValueExpr"]},
    {"name": "Expr", "symbols": ["Expr$subexpression$1"], "postprocess": dn(0, 0)},
    {"name": "Expr", "symbols": ["BinaryExpr"], "postprocess": dn(0)},
    {"name": "Expr$macrocall$2", "symbols": ["Expr"]},
    {"name": "Expr$macrocall$1", "symbols": [(lex.has("lparen") ? {type: "lparen"} : lparen), "_", "Expr$macrocall$2", "_", (lex.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": dn(2)},
    {"name": "Expr", "symbols": ["Expr$macrocall$1"], "postprocess": dn(0, 0)},
    {"name": "CondExpr$subexpression$1", "symbols": ["BinaryExpr"]},
    {"name": "CondExpr$subexpression$1", "symbols": ["Identifier"]},
    {"name": "CondExpr", "symbols": ["CondExpr$subexpression$1"], "postprocess": dn(0, 0)},
    {"name": "CondExpr$macrocall$2", "symbols": ["CondExpr"]},
    {"name": "CondExpr$macrocall$1", "symbols": [(lex.has("lparen") ? {type: "lparen"} : lparen), "_", "CondExpr$macrocall$2", "_", (lex.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": dn(2)},
    {"name": "CondExpr", "symbols": ["CondExpr$macrocall$1"], "postprocess": id},
    {"name": "DerefExpr", "symbols": ["Expr", (lex.has("dot") ? {type: "dot"} : dot), "Identifier"], "postprocess": 
        (d) => ({
          "kind": ExpressionKind.Dereference,
          "lhs": d[0],
          "rhs": d[2]
        })
          },
    {"name": "DerefExpr", "symbols": ["Expr", (lex.has("lbracket") ? {type: "lbracket"} : lbracket), "Expr", (lex.has("rbracket") ? {type: "rbracket"} : rbracket)], "postprocess": 
        (d) => ({
          "kind": ExpressionKind.Dereference,
          "lhs": d[0],
          "rhs": d[2]
        })
          },
    {"name": "IfExpr$ebnf$1$subexpression$1", "symbols": ["__", (lex.has("kw_else") ? {type: "kw_else"} : kw_else), "__", "Expr"]},
    {"name": "IfExpr$ebnf$1", "symbols": ["IfExpr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "IfExpr$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "IfExpr", "symbols": ["Expr", "__", (lex.has("kw_if") ? {type: "kw_if"} : kw_if), "__", "CondExpr", "IfExpr$ebnf$1"], "postprocess":  (d) => ({
          "kind": ExpressionKind.If,
          "condition": d[4],
          "ifTrue": d[0],
          "ifFalse": d[5]
        }) },
    {"name": "Identifier", "symbols": [(lex.has("identifier") ? {type: "identifier"} : identifier)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Identifier,
          "value": d[0].value
        }) },
    {"name": "String", "symbols": [(lex.has("string") ? {type: "string"} : string)], "postprocess":  (d) => {
          return ({
            "kind": ExpressionKind.String,
            "constant": true,
            "type": Type.String,
            "value": d[0].value,
            "source": d[0]
          });
        } },
    {"name": "ValueExpr$subexpression$1", "symbols": ["DerefExpr"]},
    {"name": "ValueExpr$subexpression$1", "symbols": ["Function"]},
    {"name": "ValueExpr$subexpression$1", "symbols": ["FunctionCall"]},
    {"name": "ValueExpr$subexpression$1", "symbols": ["Identifier"]},
    {"name": "ValueExpr$subexpression$1", "symbols": ["Number"]},
    {"name": "ValueExpr$subexpression$1", "symbols": ["String"]},
    {"name": "ValueExpr", "symbols": ["ValueExpr$subexpression$1"], "postprocess": dn(0, 0)},
    {"name": "Number$subexpression$1", "symbols": ["Float"]},
    {"name": "Number$subexpression$1", "symbols": ["Infinity"]},
    {"name": "Number$subexpression$1", "symbols": ["Integer"]},
    {"name": "Number", "symbols": ["Number$subexpression$1"], "postprocess": (d) => d[0][0]},
    {"name": "Number", "symbols": [(lex.has("lparen") ? {type: "lparen"} : lparen), "_", "Number", "_", (lex.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": dn(2)},
    {"name": "Number", "symbols": [(lex.has("minus") ? {type: "minus"} : minus), "Number"], "postprocess":  (d) => {
          const tok = Object.assign({}, d[1]);
          tok.source.text = "-" + tok.source.text;
          relocateSource(tok.source, d[0]);
          return tok;
        } },
    {"name": "Float", "symbols": [(lex.has("float") ? {type: "float"} : float)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Number,
          "constant": true,
          "format": "float",
          "type": Type.Number,
          "value": Number.parseFloat(d[0].value),
          source: d[0]
        }) },
    {"name": "Integer", "symbols": [(lex.has("base2") ? {type: "base2"} : base2)], "postprocess":  (d) => ({
        "kind": ExpressionKind.Number,
        "constant": true,
        "format": "base2",
        "value": getNumberTokenValue(d[0]),
        source: d[0] }) },
    {"name": "Integer", "symbols": [(lex.has("base8") ? {type: "base8"} : base8)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Number,
          "constant": true,
          "format": "base8",
          "value": getNumberTokenValue(d[0]),
          source: d[0]
        }) },
    {"name": "Integer", "symbols": [(lex.has("base16") ? {type: "base16"} : base16)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Number,
          "constant": true,
          "format": "base16",
          "value": getNumberTokenValue(d[0]),
          source: d[0]
        }) },
    {"name": "Integer", "symbols": [(lex.has("base10") ? {type: "base10"} : base10)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Number,
          "constant": true,
          "format": "base10",
          "type": Type.Number,
          "value": Number.parseInt(d[0].value, 10),
          source: d[0]
        }) },
    {"name": "Infinity", "symbols": [(lex.has("infinity") ? {type: "infinity"} : infinity)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Number,
          "value": Number.POSITIVE_INFINITY,
          source: d[0]
        }) },
    {"name": "ArithmeticExpr", "symbols": ["AdditiveExpr"], "postprocess": id},
    {"name": "ParenArithmeticExpr", "symbols": [(lex.has("lparen") ? {type: "lparen"} : lparen), "_", "AdditiveExpr", "_", (lex.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": dn(2)},
    {"name": "ParenArithmeticExpr", "symbols": ["ValueExpr"], "postprocess": dn(0)},
    {"name": "ExponentialExpr", "symbols": ["ParenArithmeticExpr", "_", (lex.has("power") ? {type: "power"} : power), "_", "ExponentialExpr"], "postprocess": newArithmeticExprToken(ExpressionKind.Exponential)},
    {"name": "ExponentialExpr", "symbols": ["ParenArithmeticExpr"], "postprocess": id},
    {"name": "MultiplicativeExpr", "symbols": ["MultiplicativeExpr", "_", (lex.has("divide") ? {type: "divide"} : divide), "_", "ExponentialExpr"], "postprocess": newArithmeticExprToken(ExpressionKind.Divide)},
    {"name": "MultiplicativeExpr", "symbols": ["MultiplicativeExpr", "_", (lex.has("times") ? {type: "times"} : times), "_", "ExponentialExpr"], "postprocess": newArithmeticExprToken(ExpressionKind.Multiply)},
    {"name": "MultiplicativeExpr", "symbols": ["ExponentialExpr"], "postprocess": id},
    {"name": "AdditiveExpr", "symbols": ["AdditiveExpr", "_", (lex.has("plus") ? {type: "plus"} : plus), "_", "MultiplicativeExpr"], "postprocess": newArithmeticExprToken(ExpressionKind.Add)},
    {"name": "AdditiveExpr", "symbols": ["AdditiveExpr", "_", (lex.has("minus") ? {type: "minus"} : minus), "_", "MultiplicativeExpr"], "postprocess": newArithmeticExprToken(ExpressionKind.Subtract)},
    {"name": "AdditiveExpr", "symbols": ["MultiplicativeExpr"], "postprocess": id},
    {"name": "AssignmentTarget$subexpression$1", "symbols": ["DerefExpr"]},
    {"name": "AssignmentTarget$subexpression$1", "symbols": ["Identifier"]},
    {"name": "AssignmentTarget", "symbols": ["AssignmentTarget$subexpression$1"], "postprocess": dn(0, 0)},
    {"name": "AssignExpr", "symbols": ["AssignmentTarget", "_", (lex.has("equals") ? {type: "equals"} : equals), "_", "Expr"], "postprocess":  (d) => ({
          "kind": ExpressionKind.Assignment,
          "lhs": d[0],
          "rhs": d[4]
        }) },
    {"name": "DeclareExpr$ebnf$1", "symbols": [(lex.has("colon") ? {type: "colon"} : colon)], "postprocess": id},
    {"name": "DeclareExpr$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DeclareExpr$ebnf$2$subexpression$1", "symbols": ["_", "TypeName", "_"]},
    {"name": "DeclareExpr$ebnf$2", "symbols": ["DeclareExpr$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "DeclareExpr$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "DeclareExpr", "symbols": ["AssignmentTarget", "_", (lex.has("colon") ? {type: "colon"} : colon), "DeclareExpr$ebnf$1", "DeclareExpr$ebnf$2", (lex.has("equals") ? {type: "equals"} : equals), "_", "Expr"], "postprocess":  (d) => {
          const token = ({
            "kind": ExpressionKind.Assignment,
            "lhs": d[0],
            "rhs": d[7],
            "declaration": true,
            "type": d[4]?.[1]
          });
        
          token["constant"] = !!d[3];
        
          return token;
        } },
    {"name": "TypeName$subexpression$1", "symbols": [{"literal":"string"}]},
    {"name": "TypeName$subexpression$1", "symbols": [{"literal":"number"}]},
    {"name": "TypeName", "symbols": ["TypeName$subexpression$1"], "postprocess": (d) => getTypeByName(d[0][0].value)},
    {"name": "FunctionCall$ebnf$1", "symbols": ["ArgList"], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "FunctionCall", "symbols": ["Expr", "_", (lex.has("lparen") ? {type: "lparen"} : lparen), "_", "FunctionCall$ebnf$1", "_", (lex.has("rparen") ? {type: "rparen"} : rparen)], "postprocess":  (d) => ({
          "kind": ExpressionKind.FunctionCall,
          "lhs": d[0],
          "args": d[4] ?? []
        }) },
    {"name": "Function$ebnf$1", "symbols": ["ParamList"], "postprocess": id},
    {"name": "Function$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Function$ebnf$2$subexpression$1", "symbols": ["_", (lex.has("colon") ? {type: "colon"} : colon), "_", "TypeName"]},
    {"name": "Function$ebnf$2", "symbols": ["Function$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Function$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "Function", "symbols": [(lex.has("lparen") ? {type: "lparen"} : lparen), "_", "Function$ebnf$1", "_", (lex.has("rparen") ? {type: "rparen"} : rparen), "Function$ebnf$2", "_", (lex.has("lbrace") ? {type: "lbrace"} : lbrace), "Chunk", (lex.has("rbrace") ? {type: "rbrace"} : rbrace)], "postprocess":  (d) => ({
          "kind": ExpressionKind.Function,
          "type": Type.Function,
          "params": d[2] ?? [],
          "returnType": d[5] ? getTypeByName(d[5][3]) : Type.Any,
          "body": d[8]
        }) },
    {"name": "ArgList", "symbols": ["Expr"], "postprocess": (d) => [d[0]]},
    {"name": "ArgList", "symbols": ["ArgList", "_", (lex.has("comma") ? {type: "comma"} : comma), "_", "Expr"], "postprocess":  (d) => {
          return [...d[0], d[4]];
        } },
    {"name": "ParamList", "symbols": ["Param"], "postprocess": (d) => [d[0]]},
    {"name": "ParamList", "symbols": ["ParamList", "_", (lex.has("comma") ? {type: "comma"} : comma), "_", "Param"], "postprocess":  (d) => {
          return [...d[0], d[4]];
        } },
    {"name": "Param$ebnf$1$subexpression$1", "symbols": ["_", (lex.has("colon") ? {type: "colon"} : colon), "_", "TypeName"]},
    {"name": "Param$ebnf$1", "symbols": ["Param$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Param$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Param", "symbols": ["Identifier", "Param$ebnf$1"], "postprocess":  (d) => ({
          "name": d[0].value,
          "type": d[1] ? getTypeByName(d[1][3]) : Type.Any
        }) },
    {"name": "BinaryExpr$subexpression$1", "symbols": ["OpConcat"]},
    {"name": "BinaryExpr$subexpression$1", "symbols": ["OpEQ"]},
    {"name": "BinaryExpr$subexpression$1", "symbols": ["OpLE"]},
    {"name": "BinaryExpr$subexpression$1", "symbols": ["OpLT"]},
    {"name": "BinaryExpr", "symbols": ["BinaryExpr$subexpression$1"], "postprocess": dn(0, 0)},
    {"name": "OpConcat$macrocall$2", "symbols": [(lex.has("concat") ? {type: "concat"} : concat)]},
    {"name": "OpConcat$macrocall$1", "symbols": ["Expr", "_", "OpConcat$macrocall$2", "_", "Expr"], "postprocess":  (d) => ({
          "lhs": d[0],
          "rhs": d[4]
        }) },
    {"name": "OpConcat", "symbols": ["OpConcat$macrocall$1"], "postprocess":  (d) => {
          if (d[0].lhs.constant && d[0].rhs.constant) {
            return ({
              "kind": ExpressionKind.String,
              "value": String(d[0].lhs.value) + String(d[0].rhs.value)
            });
          }
          return ({
            "kind": ExpressionKind.Concat,
            "lhs": d[0].lhs,
            "rhs": d[0].rhs
          });
        } },
    {"name": "OpEQ", "symbols": ["Expr", "_", (lex.has("equals") ? {type: "equals"} : equals), (lex.has("equals") ? {type: "equals"} : equals), "_", "Expr"], "postprocess": newBinaryOpToken(ExpressionKind.Equal)},
    {"name": "OpLE", "symbols": ["Expr", "_", (lex.has("leq") ? {type: "leq"} : leq), "_", "Expr"], "postprocess":  (d) => ({
          "kind": ExpressionKind.LEQ,
          "lhs": d[0],
          "rhs": d[4]
        }) },
    {"name": "OpLT", "symbols": ["Expr", "_", (lex.has("lt") ? {type: "lt"} : lt), "_", "Expr"], "postprocess":  (d) => ({
          "kind": ExpressionKind.LessThan,
          "lhs": d[0],
          "rhs": d[4]
        }) }
];

export var ParserStart: string = "Chunk";
