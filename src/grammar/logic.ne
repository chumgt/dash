
@lexer lex

LogicalExpr ->
  LogicalOrExpr
    {% id %}

AtomicLogicalExpr ->
  %lparen _ Expr _ %rparen
    {% dn(2) %}
  | ValueExpr
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ %and %and _ AtomicLogicalExpr
    {% (d) => newBinaryOpToken(ExpressionKind.And, d[0], d[5]) %}
  | AtomicLogicalExpr
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ %or %or _ LogicalAndExpr
    {% (d) => newBinaryOpToken(ExpressionKind.Or, d[0], d[5]) %}
  | LogicalAndExpr
    {% id %}
