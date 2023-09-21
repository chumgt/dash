@lexer lexer
@include "./number.ne"

String ->
  %string {% (d) => new expr.ValueExpression({
    ...d[0],
    "type": data.DatumType.String
  }) %}

TypeExpr ->
  %kw_type _ %lbrace (_ TypeBody):? _ %rbrace
    {% (d) => new expr.TypeExpression({
      "records": d[3]?.[1]
    }) %}

TypeBody ->
  TypeField
    {% (d) => [d[0]] %}
  | TypeBody _ %semi _ TypeField
    {% (d) => [...d[0], d[4]] %}

TypeField ->
  Identifier _ %colon _ Identifier
    {% (d) => [d[0], d[4]] %}
