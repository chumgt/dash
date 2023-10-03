@lexer lexer
@include "./number.ne"

Array ->
  %lbracket _ ArrayBody _ %rbracket
    {% (d) => new expr.ArrayExpression(d[2]) %}

Object ->
  %hash %lbracket _ ObjectBody _ %rbracket
    {% (d) => new expr.ObjectExpression(d[3]) %}

ArrayBody ->
  ArrayBody _ %comma _ ArrayEl
    {% (d) => [...d[0], d[4]] %}
  | ArrayEl {% (d) => [d[0]] %}
  | null {% () => [] %}

ArrayEl ->
  ForExpr {% id %}
  | Expr  {% id %}

ObjectBody ->
  ObjectBody _ ObjectProperty _ %semi {% (d) => [...d[0], d[2]] %}
  | ObjectProperty _ %semi {% (d) => [d[0]] %}
  | %semi {% () => [] %}
  | null {% () => [] %}

ObjectProperty ->
  DeclarationStmt
    {% nth(0) %}

StringLiteral ->
  %string {% (d) => new expr.ValueExpression({
    ...d[0],
    "type": data.DatumType.String
  }) %}

TypeLiteral ->
  %kw_type _ %lbrace _ TypeBody _ %rbrace
    {% (d) => new expr.TypeExpression({
      "records": d[4]
    }) %}

TypeBody ->
  TypeBody _ %semi _ TypeField
    {% (d) => [...d[0], d[4]] %}
  | TypeField _ %semi
    {% (d) => [d[0]] %}
  | null
    {% (d) => [] %}

TypeField ->
  Identifier _ %colon _ (Identifier | TypeLiteral)
    {% (d) => [d[0], d[4][0]] %}
