
@lexer lex

LogicalExpr ->
  LogicalOrExpr
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ %and %and _ ComparativeExpr
    {% (d) => newBinaryOpToken(ExpressionKind.And, d[0], d[5]) %}
  | ComparativeExpr
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ %or %or _ LogicalAndExpr
    {% (d) => newBinaryOpToken(ExpressionKind.Or, d[0], d[5]) %}
  | LogicalAndExpr
    {% id %}
