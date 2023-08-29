
@lexer lex
@include "./number.ne"

String ->
  %string
    {% (d) => new expr.ValueExpression(
      data.Type.String,
      JSON.parse("\""+d[0].value+"\""))
    %}

TypeExpr ->
  %kw_type _ %lbrace (_ Identifier _ %colon _ Identifier):* _ %rbrace
    {% (d) => new expr.TypeExpression({
      "records": d[3]?.map(x => [x[1], x[5]])
    }) %}
