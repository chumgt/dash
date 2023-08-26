
@lexer lex

ComparativeExpr ->
  EqualityOp {% id %}

ConcatOp ->
  ConcatOp _ %dot %dot _ ArithmeticExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Concat, d[0], d[5]) %}
  | ArithmeticExpr
    {% id %}

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
