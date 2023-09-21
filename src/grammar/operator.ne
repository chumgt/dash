@lexer lexer

OpExpr ->
  LogicalOrExpr
    {% id %}

ExponentialExpr ->
  Primary _ %power _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Exponential, d[0], d[4]) %}
  | Primary
    {% id %}

UnaryExpr ->
  %plus _ UnaryExpr
    {% nth(2) %}
  | %minus _ UnaryExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Negate, d[2]) %}
  | %not _ UnaryExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Not, d[2]) %}
  | ExponentialExpr
    {% id %}

MultiplicativeExpr ->
  MultiplicativeExpr _ %divide _ UnaryExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Divide, d[0], d[4]) %}
  | MultiplicativeExpr _ %times _ UnaryExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Multiply, d[0], d[4]) %}
  | UnaryExpr
    {% id %}

AdditiveExpr ->
  AdditiveExpr _ %plus _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Add, d[0], d[4]) %}
  | AdditiveExpr _ %minus _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Subtract, d[0], d[4]) %}
  | MultiplicativeExpr
    {% id %}

ConcatOp ->
  ConcatOp _ %dot %dot _ AdditiveExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Concat, d[0], d[5]) %}
  | AdditiveExpr
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
