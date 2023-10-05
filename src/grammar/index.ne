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
    name: {
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
        "kw_struct": "struct",
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

    fnarrow: "=>",
    concat: "..",
    eqeq: "==",
    neq: "!=",
    gteq: ">=",
    lteq: "<=",
    andand: "&&",
    oror: "||",

    comma: ",",
    pow: "**",
    div: "/",
    mul: "*",
    add: "+",
    sub: "-",
    dot: ".",
    colon: ":",
    semi: ";",

    equals: "=",
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
    dollar: "$",
    hash: "#",
    under: "_",

    infinity: "\u221E",

    // comment: {
    //   match: /#[^\n]*/,
    //   value: (s) => s.substring(1)
    // },
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
  _ Statements _
    {% (d) => new stmt.StatementBlock(d[1]) %}
  | _ ReturnExpr _
    {% nth(1) %}

DELIM -> _ ";":+
EOL -> _ TERM:+
TERM -> "\n" | ";"

ExprBlock ->
  "{" _ Statements:? _ ReturnExpr _ "}"
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock(d[2]??[]), d[4]) %}
  | "{" _ Statements:? _ ReturnStmt _ "}"
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock(d[2]??[]), d[4].expr) %}
  | ReturnExpr
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock([]), d[0]) %}

StmtBlock ->
  "{" _ Statements:? _ "}"
    {% (d) => new stmt.StatementBlock(d[2] ?? []) %}
  | Stmt _ ";"
    {% (d) => new stmt.StatementBlock([d[0]]) %}
  | ";"
    {% (d) => new stmt.StatementBlock([]) %}

Statements ->
  Stmt DELIM:? _ Statements {% (d) => [d[0], ...d[3]] %}
  | Stmt DELIM:? {% (d) => [d[0]] %}
  | DELIM {% (d) => [] %}

ReturnExpr ->
  IfExpr {% id %}
  | FunctionLiteral {% id %}

Expr ->
  LogicalOrExpr     {% id %}

Stmt ->
  AssignmentStmt  {% id %}
  | Call          {% id %}
  | ExportStmt    {% id %}
  | ForStmt       {% id %}
  | IfStmt        {% id %}
  | ReturnStmt    {% id %}
  | ThrowStmt     {% id %}
  | WhileStmt     {% id %}
  | StringLiteral {% id %} # comments

ExportStmt ->
  (AnnotationList __):? "export" __ DeclarationStmt
    {% (d) => new stmt.ExportStatement(
        d[0]?.[0] ? annotate(d[3], d[0][0]) : d[3]) %}

CastExpr ->
  Primary _ "as" _ Primary
    {% (d) => new expr.CastExpression(d[0], d[4]) %}
  | LogicalOrExpr
    {% id %}

ForExpr ->
  IfExpr __ "for" __ Name __ "in" __ OpExpr
    {% (d) => new expr.ForMapExpression(d[4], d[8], d[0]) %}

SwitchExpr ->
  "switch" (_ Atom):? _ "{" _ SwitchBody _ "}"
    {% (d) => new expr.SwitchExpression(d[1]?.[1], d[5].cases, d[5].defaultCase) %}
  | CastExpr
    {% id %}

IfExpr ->
  SwitchExpr __ "if" __ OpExpr __ "else" __ IfExpr
    {% (d) => new expr.IfExpression(d[4], d[0], d[8]) %}
  | SwitchExpr
    {% id %}

IfStmt ->
  "if" __ OpExpr _ StmtBlock (_ ElseClause):?
    {% (d) => new stmt.IfStatement(d[2], d[4], d[5]?.[1]) %}
ElseClause ->
  "else" _ StmtBlock
    {% nth(2) %}

ForStmt ->
  "for" __ Name __ "in" __ OpExpr __ StmtBlock
    {% (d) => new stmt.ForInStatement(d[2], d[6], d[8]) %}

ReturnStmt ->
  "return" _ ReturnExpr
    {% (d) => new stmt.ReturnStatement(d[2]) %}

ThrowStmt ->
  "throw" __ ExprBlock
    {% (d) => new stmt.ThrowStatement(d[2]) %}

WhileStmt ->
  "while" __ OpExpr _ StmtBlock
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
  OpExpr _ "=>" _ ExprBlock
    {% (d) => [d[0], d[4]] %}
SwitchElseCase ->
  "else" _ "=>" _ ExprBlock
    {% nth(4) %}

Annotation ->
  "@" Primary
    {% nth(1) %}
AnnotationList ->
  AnnotationList __ Annotation {% (d) => [...d[0], d[2]] %}
  | Annotation {% (d) => [d[0]] %}

Index ->
  Primary _ "[" _ ReturnExpr _ "]"
    {% (d) => new expr.DereferenceExpression(d[0], d[4]) %}
  | Primary _ "." Name
    {% (d) => new expr.DereferenceExpression(d[0], d[3]) %}

Call ->
  Primary _ "(" _ Arguments:? _ ")"
    {% (d) => new expr.CallExpression(d[0], d[4]??[]) %}

Primary ->
  Index  {% id %}
  | Call {% id %}
  | Atom {% id %}

Reference ->
  Index {% id %}
  | Name {% id %}

Atom ->
  "(" _ ReturnExpr _ ")" {% nth(2) %}
  | Array          {% id %}
  | Function       {% id %}
  | Object         {% id %}
  | Name           {% id %}
  | BooleanLiteral {% id %}
  | NumberLiteral  {% id %}
  | StringLiteral  {% id %}
  | TypeLiteral    {% id %}

TypeSignature ->
  ":" _ Primary
    {% (d) => d[2] %}

Name ->
  %name {%
    (d) => new expr.IdentifierExpression(d[0])
  %}
