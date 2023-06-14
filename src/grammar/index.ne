@{%
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
    minus: "-",
    plus: "+",
    power: "**",
    times: "*",
    dot: ".",
    colon: ":",
    semi: ";",
    eq: "=",

    //equ: "==",
    neq: "!=",
    gt: ">",
    //geq: ">=",
    lt: "<",
    //leq: ">=",
    and: "&",
    or: "|",

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
%}

# - Includes are relative to the *project* root and must come after the entry
# point (`Chunk`).

@lexer lex
@preprocessor typescript
@builtin "whitespace.ne"

Chunk ->
  _ Expr _
    {% (d) => [d[1]] %}
  | Chunk _ %semi _ Expr _
      {% (d) => [...d[0], d[4]] %}

Expr ->
  AssignExpr {% id %}
  | ArithmeticExpr {%id%}
  | ComparativeExpr {%id%}
  | ConcatExpr {%id%}
  | LogicalExpr  {%id%}
  | ValueExpr {%id%}

BinaryExpr ->
  ArithmeticExpr {% id %}
  | EqualityOp {% id %}
  | LogicalExpr {% id %}

DerefExpr ->
  Expr %dot Identifier {%
    (d) => ({
      "kind": ExpressionKind.Dereference,
      "lhs": d[0],
      "rhs": d[2]
    })
  %}
  | Expr %lbracket Expr %rbracket {%
    (d) => ({
      "kind": ExpressionKind.Dereference,
      "lhs": d[0],
      "rhs": d[2]
    })
  %}

Identifier ->
  %identifier {% (d) => ({
    "kind": ExpressionKind.Identifier,
    "value": d[0].value
  }) %}

String ->
  %string {% (d) => ({
    "kind": ExpressionKind.String,
    "constant": true,
    "type": Type.String,
    "value": d[0].value,
    "source": d[0]
  }) %}

ValueExpr ->
  (CallExpr | DerefExpr | ValueLiteral)
    {% dn(0, 0) %}

ValueLiteral ->
  (Function | Identifier | Number | String)
    {% dn(0, 0) %}

@include "src/grammar/number.ne"
@include "src/grammar/arithmetic.ne"
@include "src/grammar/assignment.ne"
@include "src/grammar/function.ne"
@include "src/grammar/logic.ne"
@include "src/grammar/operator.ne"
