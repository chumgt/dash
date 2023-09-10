@{%
  import * as moo from "moo";
  import * as data from "../data";
  import * as expr from "../expression";
  import * as node from "../node";
  import * as stmt from "../statement";

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
        "kw_export": "export",
        "kw_fn": "fn",
        "kw_switch": "switch",
        "kw_type": "type"
      })
    },
    float: {
      match: /[0-9]+\.[0-9]+/,
      value: (x) => Number.parseFloat(x) as any
    },
    base2: {
      match: /0b[0-1]+/,
      value: (x) => Number.parseInt(x.substring(2), 2) as any
    },
    base8: {
      match: /0o[0-7]+/,
      value: (x) => Number.parseInt(x.substring(2), 8) as any
    },
    base16: {
      match: /0x[a-fA-F0-9]+/,
      value: (x) => Number.parseInt(x.substring(2), 16) as any
    },
    base10: {
      match: /0|[1-9][0-9]*/,
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

    // fslash: "/",
    // bslash: "\\",

    infinity: "\u221E",

    comment: {
      match: /#[^\n]*/,
      value: (s) => s.substring(1)
    },
    ws: {
      match: /[ \t\n\v\f]+/,
      lineBreaks: true
    }
  });
%}

# `@include`s in this file are relative to the project root.

@lexer lex
@preprocessor typescript
@include "src/grammar/arithmetic.ne"
@include "src/grammar/assignment.ne"
@include "src/grammar/function.ne"
@include "src/grammar/logic.ne"
@include "src/grammar/number.ne"
@include "src/grammar/operator.ne"
@include "src/grammar/value.ne"
@include "src/grammar/whitespace.ne"

Chunk ->
  _ (Expr | ModuleBlock) _
    {% dn(1, 0) %}

ModuleBlock ->
  ModuleBody
    {% (d) => new node.ModuleNode(d[0]) %}

ModuleBody ->
  ModuleStmt _ %semi
    {% (d) => [d[0]] %}
  | ModuleBody _ ModuleStmt _ %semi
    {% (d) => [...d[0], d[2]] %}

Proc ->
  ProcBody
    {% (d) => new node.ProcedureBlock(d[0]) %}

ProcBody ->
  Stmt _ %semi
    {% (d) => [d[0]] %}
  | Proc _ Stmt _ %semi
    {% (d) => [...d[0], d[2]] %}

Expr ->
  BinaryOpExpr {% id %}
  | CastExpr   {% id %}
  | IfExpr     {% id %}
  | SwitchExpr {% id %}
  | TypeExpr   {% id %}

ModuleStmt ->
  ExportStmt {% id %}
  | Stmt     {% id %}

Stmt ->
  AssignmentStmt  {% id %}
  | CallExpr {% id %}
  | IfStmt   {% id %}

ExportStmt ->
  %kw_export __ DeclarationStmt
    {% (d) => new stmt.ExportStatement(d[2]) %}

IfExpr ->
  ValueExpr __ %kw_if __ LogicalOrExpr __ %kw_else __ ValueExpr
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}

IfStmt ->
  %kw_if __ Expr _ %lbrace _ Proc _ %rbrace (_ %kw_else _ %lbrace _ Proc _ %rbrace):?
    {% (d) => new stmt.IfStatement(d[2], d[6], d[9]?.[5]) %}

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
  %lparen _ Expr _ %rparen  {% dn(2) %}
  | CallExpr     {% id %}
  | DerefExpr    {% id %}
  | ValueLiteral {% id %}

Identifier ->
  %identifier {% (d) => new expr.IdentifierExpression(d[0].value) %}

ValueLiteral ->
  Function {% id %}
  | Number {% id %}
  | String {% id %}

# Comment ->
#   %comment
#     {% (d) => null %}
# Comment ->
#   %fslash %times %times %fslash
#     {% () => null %}
