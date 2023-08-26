
@lexer lex
@include "./number.ne"

String ->
  %string {% (d) => new expr.ValueExpression(Type.String, JSON.parse("\""+d[0].value+"\"")) %}
  # %string {% (d) => new ValueExpression(Type.String, JSON.parse("\""+d[0].value+"\"")) %}
