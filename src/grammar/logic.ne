
@lexer lex

LogicalExpr ->
  LogicalOrExpr
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ %and %and _ ValueExpr
    {% (d) => newBinaryOpToken(ExpressionKind.And, d[0], d[5]) %}
  | ValueExpr
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ %or %or _ LogicalAndExpr
    {% (d) => newBinaryOpToken(ExpressionKind.Or, d[0], d[5]) %}
  | LogicalAndExpr
    {% id %}
