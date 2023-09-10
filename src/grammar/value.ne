
@lexer lex

String ->
  %string {% (d) => new expr.ValueExpression({
    ...d[0],
    "type": data.DatumType.String
  }) %}

TypeExpr ->
  %kw_type _ %lbrace (_ Identifier _ %colon _ Identifier):* _ %rbrace
    {% (d) => new expr.TypeExpression({
      "records": d[3]?.map(x => [x[1], x[5]])
    }) %}
