
@lexer lex

LogicalExpr ->
  LogicalOrExpr
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ %and %and _ ComparativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.And, d[0], d[5]) %}
  | ComparativeExpr
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ %or %or _ LogicalAndExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Or, d[0], d[5]) %}
  | LogicalAndExpr
    {% id %}
