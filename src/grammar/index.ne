@{%
  import * as moo from "moo";
  import * as data from "../data";
  import * as expr from "../expression";
  import * as node from "../node";
  import * as stmt from "../statement";

  /** Returns a Nearley postprocessor which returns
   * `d[index0][index1][index2][...][indexN]`. */
  function nth(index0: number, ...indices: readonly number[]) {
    return function (d) {
      let value = d[index0];
      for (const index of indices)
        value = value[index];
      return value;
    };
  }

  // Some tokens have `as any` because Nearley-to-Typescript doesn't like it otherwise.
  const lexer = moo.compile({
    identifier: {
      match: /[a-zA-Z_][a-zA-Z0-9_]*/,
      type: moo.keywords({
        "kw_if": "if",
        "kw_in": "in",
        "kw_else": "else",
        "kw_export": "export",
        "kw_fn": "fn",
        "kw_for": "for",
        "kw_return": "return",
        "kw_switch": "switch",
        "kw_type": "type",
        "kw_while": "while",
        "kw_true": "true",
        "kw_false": "false"
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
      value: (x) => JSON.parse(x.replaceAll("\n", "\\n"))
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

    dollar: "$",
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

@lexer lexer
@preprocessor typescript
@include "src/grammar/assignment.ne"
@include "src/grammar/function.ne"
@include "src/grammar/number.ne"
@include "src/grammar/operator.ne"
@include "src/grammar/value.ne"
@include "src/grammar/whitespace.ne"

Chunk ->
  _ ChunkBody _
    {% (d) => new node.Block(d[1]) %}
  | _ ReturnExpr _
    {% nth(1) %}

ChunkBody ->
  Stmt _ %semi
    {% (d) => [d[0]] %}
  | ChunkBody _ Stmt _ %semi
    {% (d) => [...d[0], d[2]] %}
  | null
    {% (d) => [] %}

Block ->
  %lbrace _ ChunkBody _ %rbrace
    {% (d) => new node.Block(d[2]) %}

BlockExpr ->
  %lbrace _ ChunkBody _ ReturnExpr _ %rbrace
    {% (d) => new expr.BlockExpression(
        new node.Block(d[2]), d[4]) %}

ReturnExpr ->
  ReturnStmt   {% id %}
  | BlockExpr  {% id %}
  | IfExpr     {% id %}
  | SwitchExpr {% id %}
  | Expr       {% id %}

Expr ->
  OpExpr {% id %}
  | Function {% id %}

ParendExpr ->
  %lparen _ Expr _ %rparen
    {% nth(2) %}

Stmt ->
  AssignmentStmt  {% id %}
  | FunctionDecl {% id %}
  | Primary    {% id %}
  | ExportStmt {% id %}
  | ForStmt    {% id %}
  | IfStmt     {% id %}
  | ReturnStmt {% id %}
  | WhileStmt  {% id %}

ExportStmt ->
  %kw_export __ DeclarationStmt
    {% (d) => new stmt.ExportStatement(d[2]) %}

SwitchExpr ->
  %kw_switch (_ Atom):? _ %lbrace _ SwitchBody _ %rbrace
    {% (d) => new expr.SwitchExpression(d[1]?.[1], d[5].cases, d[5].defaultCase) %}

IfExpr ->
  Expr __ %kw_if __ BooleanExpr __ %kw_else __ ReturnExpr
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}

IfStmt ->
  %kw_if __ BooleanExpr _ Block (_ %kw_else _ Block):?
    {% (d) => new stmt.IfStatement(d[2], d[4], d[5]?.[3]) %}

ForStmt ->
  %kw_for __ Identifier __ %kw_in __ Expr _ Block
    {% (d) => new stmt.ForInStatement(d[2], d[6], d[8]) %}

WhileStmt ->
  %kw_while __ BooleanExpr _ Block
    {% (d) => new stmt.WhileStatement(d[2], d[4]) %}

ReturnStmt ->
  %kw_return (_ Atom):?
    {% (d) => new stmt.ReturnStatement(d[1]?.[1]) %}

SwitchBody ->
  SwitchCaseList (_ SwitchElseCase):?
    {% (d) => ({cases: d[0], defaultCase: d[1]?.[1]}) %}

SwitchCaseList ->
  SwitchCase _ %semi
    {% (d) => [d[0]] %}
  | SwitchCaseList _ SwitchCase _ %semi
    {% (d) => [...d[0], d[2]] %}

SwitchCase ->
  Expr _ %eq %gt _ ReturnExpr
    {% (d) => [d[0], d[5]] %}

SwitchElseCase ->
  %kw_else _ %eq %gt _ ReturnExpr _ %semi
    {% nth(5) %}

BooleanExpr ->
  ValueExpr {% id %}
  | OpExpr  {% id %}
  | Number  {% id %}

Deref ->
  Deref _ %dot Identifier
    {% (d) => new expr.DereferenceExpression(d[0], d[3]) %}
  | Primary
    {% id %}

Primary ->
  Primary _ %dot Identifier
    {% (d) => new expr.DereferenceExpression(d[0], d[3]) %}
  | Primary _ %lparen _ ArgList _ %rparen
    {% (d) => new expr.CallExpression(d[0], d[4]) %}
  | Atom
    {% id %}

Atom ->
  ParendExpr   {% id %}
  | Identifier {% id %}
  | Number {% id %}
  | String {% id %}

Identifier ->
  (%dollar | %identifier) {%
    (d) => new expr.IdentifierExpression(d[0][0].value)
  %}
