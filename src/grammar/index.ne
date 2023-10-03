@{%
  import * as moo from "moo";
  import * as data from "../data.js";
  import * as expr from "../expression.js";
  import * as node from "../node.js";
  import * as stmt from "../statement.js";
  import { DashParseError } from "../parse.js";

  /** Returns a Nearley postprocessor which returns
   * `d[index0][index1][index2][...][indexN]`. */
  export function nth(index0: number | string, ...indices: readonly (number | string)[]) {
    return function (d) {
      let value = d[index0];
      for (const index of indices)
        value = value[index];
      return value;
    };
  }

  function annotate(expr: any, annots: expr.Expression[]) {
    if (! expr.info)
      throw new DashParseError("cannot annotate expr kind " + expr.kind);

    if (typeof expr.info.annotations === "undefined")
      expr.info.annotations = [];
    if (Array.isArray(expr.info.annotations))
      expr.info.annotations.push(...annots);
    else
      throw new Error("annotations is not an array! hmm...");
    return expr;
  }

  // Some tokens have `as any` because Nearley-to-Typescript doesn't like it otherwise.
  const lexer = moo.compile({
    identifier: {
      match: /[a-zA-Z_][a-zA-Z0-9_]*/,
      type: moo.keywords({
        "kw_as": "as",
        "kw_if": "if",
        "kw_in": "in",
        "kw_else": "else",
        "kw_export": "export",
        "kw_fn": "fn",
        "kw_for": "for",
        "kw_return": "return",
        "kw_switch": "switch",
        "kw_throw": "throw",
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
      value: (x) => x.substring(1, x.length-1).replace("\\n", "\n")
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
    at: "@",
    under: "_",

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
  _ StmtBlockBody _
    {% (d) => new stmt.StatementBlock(d[1]) %}
  | _ Expr _
    {% nth(1) %}

ExprBlock ->
  %lbrace _ StmtBlockBody _ Expr _ %rbrace
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock(d[2]), d[4]) %}
  |  %lbrace _ StmtBlockBody _ ReturnStmt _ %rbrace
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock(d[2]), d[4].expr) %}
  | Expr
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock([]), d[0]) %}

StmtBlock ->
  %lbrace _ StmtBlockBody _ %rbrace
    {% (d) => new stmt.StatementBlock(d[2]) %}
  | Stmt _ %semi
    {% (d) => new stmt.StatementBlock([d[0]]) %}
  | %semi
    {% (d) => new stmt.StatementBlock([]) %}

StmtBlockBody ->
  StmtBlockBody _ Stmt {% (d) => [...d[0], d[2]] %}
  | Stmt {% (d) => [d[0]] %}
  | null {% (d) => [] %}

Expr ->
  OpExpr     {% id %}
  | CastExpr {% id %}
  | Function {% id %}
  | IfExpr     {% id %}
  | SwitchExpr {% id %}

Stmt ->
  AssignmentStmt {% id %}
  | FunctionDecl {% id %}
  | CallExpr   {% id %}
  | ExportStmt {% id %}
  | ForStmt    {% id %}
  | IfStmt     {% id %}
  | ReturnStmt {% id %}
  | ThrowStmt  {% id %}
  | WhileStmt  {% id %}
  | StringLiteral {% id %} # comments

ExportStmt ->
  (AnnotationList _):? %kw_export __ DeclarationStmt
    {% (d) => new stmt.ExportStatement(
        d[0]?.[0] ? annotate(d[3], d[0][0]) : d[3]) %}

CallExpr ->
  Primary _ %lparen _ ArgList _ %rparen
    {% (d) => new expr.CallExpression(d[0], d[4]) %}

CastExpr ->
  Primary _ %kw_as _ Primary
    {% (d) => new expr.CastExpression(d[0], d[4]) %}

IfExpr ->
  Primary __ %kw_if __ OpExpr __ %kw_else __ ExprBlock
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}
  # | ForExpr
  #   {% id %}

ForExpr ->
  ExprBlock __ %kw_for __ Identifier __ %kw_in __ Expr
    {% (d) => new expr.ForMapExpression(d[4], d[8], d[0]) %}

SwitchExpr ->
  %kw_switch (_ Atom):? _ %lbrace _ SwitchBody _ %rbrace
    {% (d) => new expr.SwitchExpression(d[1]?.[1], d[5].cases, d[5].defaultCase) %}

IfStmt ->
  %kw_if __ OpExpr _ StmtBlock (_ ElseClause):?
    {% (d) => new stmt.IfStatement(d[2], d[4], d[5]?.[1]) %}
ElseClause ->
  %kw_else _ StmtBlock
    {% nth(2) %}

ForStmt ->
  %kw_for __ Identifier __ %kw_in __ Expr __ StmtBlock
    {% (d) => new stmt.ForInStatement(d[2], d[6], d[8]) %}

ReturnStmt ->
  %kw_return _ Expr
    {% (d) => new stmt.ReturnStatement(d[2]) %}

ThrowStmt ->
  %kw_throw __ ExprBlock
    {% (d) => new stmt.ThrowStatement(d[2]) %}

WhileStmt ->
  %kw_while __ OpExpr _ StmtBlock
    {% (d) => new stmt.WhileStatement(d[2], d[4]) %}

SwitchBody ->
  SwitchCaseList (_ SwitchElseCase):?
    {% (d) => ({cases: d[0], defaultCase: d[1]?.[1]}) %}
SwitchCaseList ->
  SwitchCaseList _ SwitchCase
    {% (d) => [...d[0], d[2]] %}
  | SwitchCase
    {% (d) => [d[0]] %}
SwitchCase ->
  Expr _ %eq %gt _ ExprBlock
    {% (d) => [d[0], d[5]] %}
SwitchElseCase ->
  %kw_else _ %eq %gt _ ExprBlock
    {% nth(5) %}

Index ->
  Primary _ %lbracket _ Expr _ %rbracket
    {% (d) => new expr.DereferenceExpression(d[0], d[4]) %}
  | Primary _ %dot Identifier
    {% (d) => new expr.DereferenceExpression(d[0], d[3]) %}

Primary ->
  Index      {% id %}
  | CallExpr {% id %}
  | Atom     {% id %}

Reference ->
  Index {% id %}
  | Identifier {% id %}

Atom ->
  %lparen _ Expr _ %rparen {% nth(2) %}
  | Array         {% id %}
  | Identifier    {% id %}
  | NumberLiteral {% id %}
  | StringLiteral {% id %}
  | TypeLiteral   {% id %}

Identifier ->
  %identifier {%
    (d) => new expr.IdentifierExpression(d[0].value)
  %}
