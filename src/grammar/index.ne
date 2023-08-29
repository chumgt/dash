@{%
  import * as moo from "moo";

  import { DashError } from "../error";
  import * as data from "../data";
  import * as expr from "../expression";
  import * as node from "../node";
  import * as token from "../token";
  import * as value from "../value";

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
        "kw_else": "else",
        "kw_fn": "fn",
        "kw_switch": "switch",
        "kw_type": "type"
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

# `@include`s in this file are relative to the project root.

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
  _ FunctionBody _
    {% (d) => new node.ChunkNode(d[1]) %}

# Chunk ->
#   _ Expr _
#     {% (d) => new node.ChunkNode([d[1]]) %}

Expr ->
  BinaryOpExpr {% id %}
  | DerefExpr {% id %}
  | IfExpr    {% id %}
  | CallExpr  {% id %}
  | CastExpr  {% id %}
  | DerefExpr {% id %}
  | SwitchExpr {% id %}
  | TypeExpr  {% id %}

Stmt ->
  DeclarationStmt  {% id %}
  | AssignmentExpr {% id %}
  | CallExpr {% id %}
  | IfStmt   {% id %}

IfExpr ->
  Expr __ %kw_if __ LogicalOrExpr __ %kw_else __ Expr
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}

IfStmt ->
  %kw_if __ Expr _ %lbrace _ FunctionBody _ %rbrace
    {% (d) => new expr.IfStatement(d[2], d[6]) %}

CastExpr ->
  Expr _ %colon _ Identifier
    {% (d) => new expr.CastExpression(d[4], d[0]) %}

DerefExpr ->
  DerefExpr _ %dot Identifier
    {% (d) => new expr.DereferenceExpression(d[0], d[3]) %}
  | Identifier
    {% id %}

SwitchExpr ->
  %kw_switch _ ValueExpr _ %lbrace _ SwitchBody _ %rbrace
    {% (d) => new expr.SwitchExpression(d[2], d[6]) %}

SwitchBody ->
  SwitchCase
    {% (d) => [d[0]] %}
  | SwitchBody _ %comma _ SwitchCase
    {% (d) => [...d[0], d[4]] %}

SwitchCase ->
  ValueExpr _ %minus %gt _ Expr
    {% (d) => [d[0], d[5]] %}

ValueExpr ->
  %lparen _ Expr _ %rparen
    {% dn(2) %}
  | DerefExpr
    {% id %}
  | ValueLiteral
    {% id %}

Identifier ->
  %identifier {% (d) => new expr.IdentifierExpression(d[0].value) %}

ValueLiteral ->
  (Function | Number | String)
    {% dn(0, 0) %}
