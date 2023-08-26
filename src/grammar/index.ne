@{%
  import * as moo from "moo";

  import { Type } from "../data";
  import { DashError } from "../error";
  import {
    CallExpression,
    CastExpression,
    DereferenceExpression,
    ExpressionKind,
    FunctionExpression,
    IdentifierExpression,
    ValueExpression,
    ValueKind
  } from "../expression";
  import * as expr from "../expression";
  import * as token from "../token";

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
      case "any":
        return Type.Any;
      case "function":
        return Type.Function;
      case "number":
        return Type.Number;
      case "string":
        return Type.String;
      default:
        throw new DashError("Unknown type " + name);
    }
  }

  // Some tokens have `as any` because Nearley-to-Typescript doesn't like it otherwise.
  const lex = moo.compile({
    //comment: {
    //  match: /\/\/.*\n/ as any,
    //  lineBreaks: true,
    //  value: (x) => null as any
    //},
    identifier: {
      match: /[a-zA-Z_][a-zA-Z0-9_]*/,
      type: moo.keywords({
        "kw_if": "if",
        "kw_else": "else"
      })
    },
    float: /[0-9]+\.[0-9]+/,
    base2: /0b[0-1]+/,
    base8: /0o[0-7]+/,
    base16: /0x[0-9A-Fa-f]+/,
    base10: {
      match: /0|[1-9][0-9]*/ as any,
      value: (x) => Number.parseInt(x, 10) as any
    },
    string: {
      match: /"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"])*"/,
      lineBreaks: true,
      value: (x) => x.substring(1, x.length - 1)
    },

    comma: ",",
    divide: "/",
    minus: "-",
    plus: "+",
    power: "**",
    times: "*",
    dot: ".",
    colon: ":",
    semi: ";",

    eq: "=",
    gt: ">",
    lt: "<",
    and: "&",
    or: "|",
    not: "!",

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

# - Includes are relative to the *project* root.

@lexer lex
@preprocessor typescript

@builtin "whitespace.ne"
@include "src/grammar/arithmetic.ne"
@include "src/grammar/assignment.ne"
@include "src/grammar/function.ne"
@include "src/grammar/logic.ne"
@include "src/grammar/number.ne"
@include "src/grammar/operator.ne"
@include "src/grammar/value.ne"

Chunk ->
  FunctionBody
    {% id %}

Expr ->
  AssignmentExpr {% id %}
  # BinaryExpr  {% id %}
  # | IfExpr    {% id %}
  # | ValueExpr {% id %}

BinaryExpr ->
  AssignExpr {% id %}
  | LogicalExpr {% id %}

IfExpr ->
  Expr __ "if" __ Expr __ "else" __ Expr
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}
  | Expr
    {% id %}

Identifier ->
  %identifier {% (d) => new IdentifierExpression(d[0].value) %}

ValueExpr ->
  (CallExpr | CastExpr | DerefExpr | ValueLiteral)
    {% dn(0, 0) %}
  | %lparen _ Expr _ %rparen
    {% dn(2) %}

CastExpr ->
  Expr _ %colon _ Identifier
    {% (d) => new CastExpression(d[4], d[0]) %}

DerefExpr ->
  DerefExpr _ %dot Identifier
    {% (d) => new DereferenceExpression(d[0], d[3]) %}
  | Identifier
    {% id %}

ValueLiteral ->
  (Function | Number | String)
    {% dn(0, 0) %}
