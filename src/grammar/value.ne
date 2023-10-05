@lexer lexer
@include "./number.ne"

Array ->
  "[" _ ArrayElements:? _ "]"
    {% (d) => new expr.ArrayExpression(d[2]??[]) %}

Object ->
  "#" "{" _ ObjectProperties:? _ "}"
    {% (d) => new expr.ObjectExpression(d[3]??[]) %}

ArrayElements ->
  ArrayElements _ "," _ ArrayEl {% (d) => [...d[0], d[4]] %}
  | ArrayEl {% (d) => [d[0]] %}
ArrayEl ->
  ForExpr      {% id %}
  | ReturnExpr {% id %}

ObjectProperties ->
  ObjectProperty _ ";" _ ObjectProperties {% (d) => [d[0], ...d[4]] %}
  | ObjectProperty EOL:? {% (d) => [d[0]] %}

ObjectProperty ->
  DeclarationStmt
    {% nth(0) %}

BooleanLiteral ->
  ("false" | "true") {% (d) => new expr.LiteralExpression({
    "type": data.DatumType.Int8,
    "value": d[0][0].value === "true" ? 1 : 0
  }) %}

StringLiteral ->
  %string {% (d) => new expr.LiteralExpression({
    ...d[0],
    "type": data.DatumType.String
  }) %}

TypeLiteral ->
  "type" _ "{" _ TypeBody _ "}"
    {% (d) => new expr.TypeExpression({
      "records": d[4]
    }) %}

TypeBody ->
  TypeBody _ ";" _ TypeField
    {% (d) => [...d[0], d[4]] %}
  | TypeField _ ";"
    {% (d) => [d[0]] %}
  | null
    {% (d) => [] %}

TypeField ->
  Name _ ":" _ (Name | TypeLiteral)
    {% (d) => [d[0], d[4][0]] %}
