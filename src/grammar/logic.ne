
@lexer lex

RelationalOp ->
  RelationalOp _ %gt _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.GT, d[0], d[4]) %}
  | RelationalOp _ %gt %eq _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.GEQ, d[0], d[5]) %}
  | RelationalOp _ %lt _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.LT, d[0], d[4]) %}
  | RelationalOp _ %lt %eq _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.LEQ, d[0], d[5]) %}
  | ConcatOp
    {% id %}

EqualityOp ->
  EqualityOp _ %eq %eq _ RelationalOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.EQ, d[0], d[5]) %}
  | EqualityOp _ %not %eq _ RelationalOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.NEQ, d[0], d[5]) %}
  | RelationalOp
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ %and %and _ EqualityOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.And, d[0], d[5]) %}
  | EqualityOp
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ %or %or _ LogicalAndExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Or, d[0], d[5]) %}
  | LogicalAndExpr
    {% id %}
