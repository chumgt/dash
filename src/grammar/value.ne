@lexer lexer
@include "./number.ne"
@include "./string.ne"

ArrayLiteral ->
  "[" _ ArrayElements:? _ "]"
    {% (d) => new expr.ArrayExpression(d[2]??[]) %}

ObjectLiteral ->
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
  | ObjectProperty DELIM:? {% (d) => [d[0]] %}

ObjectProperty ->
  DeclarationStmt
    {% nth(0) %}

BooleanLiteral ->
  ("false" | "true") {% (d) => new expr.LiteralExpression({
    "type": data.DatumType.Int8,
    "value": d[0][0].value === "true" ? 1 : 0
  }) %}

TypeLiteral ->
  "#" "type" _ "{" _ TypeFields:? _ "}"
    {% (d) => new expr.TypeExpression({
      "records": d[5] ?? []
    }) %}

TypeFields ->
  TypeFields _ ";" _ TypeField DELIM:? {% d => [...d[0], d[4]] %}
  | TypeField DELIM:? {% d => [d[0]] %}

TypeField ->
  Name _ ":" _ (Name | TypeLiteral)
    {% (d) => [d[0], d[4][0]] %}
