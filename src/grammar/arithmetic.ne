#
# Grammar for parsing arithmetic expressions, honouring order of operations.
#

@lexer lex

ExponentialExpr ->
  ValueExpr _ %power _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Exponential, d[0], d[4]) %}
  | ValueExpr
    {% id %}

UnaryExpr ->
  %plus _ UnaryExpr
    {% dn(2) %}
  | %minus _ UnaryExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Negate, d[2]) %}
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
