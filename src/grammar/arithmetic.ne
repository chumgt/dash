#
# Grammar for parsing arithmetic expressions, honouring order of operations.
#

@lexer lex

ArithmeticExpr ->
  AdditiveExpr
    {% id %}

UnaryExpr ->
  %plus _ ArithmeticExpr
    {% dn(2) %}
  | %minus _ ArithmeticExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Negate, d[2]) %}
  | ValueExpr
    {% id %}

ExponentialExpr ->
  UnaryExpr _ %power _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Exponential, d[0], d[4]) %}
  | UnaryExpr
    {% id %}

MultiplicativeExpr ->
  MultiplicativeExpr _ %divide _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Divide, d[0], d[4]) %}
  | MultiplicativeExpr _ %times _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Multiply, d[0], d[4]) %}
  | ExponentialExpr
    {% id %}

AdditiveExpr ->
  AdditiveExpr _ %plus _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Add, d[0], d[4]) %}
  | AdditiveExpr _ %minus _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Subtract, d[0], d[4]) %}
  | MultiplicativeExpr
    {% id %}
