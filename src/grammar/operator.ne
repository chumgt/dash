
@lexer lex

BinaryOpExpr ->
  LogicalOrExpr
    {% id %}

ConcatOp ->
  ConcatOp _ %dot %dot _ AdditiveExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Concat, d[0], d[5]) %}
  | AdditiveExpr
    {% id %}
