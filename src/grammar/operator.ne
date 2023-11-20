@lexer lexer

ExponentialExpr ->
  Primary _ "**" _ ExponentialExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Exponential, d[0], d[4]) %}
  | Primary
    {% id %}

UnaryExpr ->
  "+" _ UnaryExpr
    {% nth(2) %}
  | "-" _ UnaryExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Negate, d[2]) %}
  | "!" _ UnaryExpr
    {% (d) => new expr.UnaryOpExpression(expr.UnaryOpKind.Not, d[2]) %}
  | ExponentialExpr
    {% id %}

MultiplicativeExpr ->
  MultiplicativeExpr _ "/" _ UnaryExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Divide, d[0], d[4]) %}
  | MultiplicativeExpr _ "*" _ UnaryExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Multiply, d[0], d[4]) %}
  | UnaryExpr
    {% id %}

AdditiveExpr ->
  AdditiveExpr _ "+" _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Add, d[0], d[4]) %}
  | AdditiveExpr _ "-" _ MultiplicativeExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Subtract, d[0], d[4]) %}
  | MultiplicativeExpr
    {% id %}

ConcatOp ->
  ConcatOp _ ".." _ AdditiveExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Concat, d[0], d[4]) %}
  | AdditiveExpr
    {% id %}

RelationalOp ->
  RelationalOp _ ">" _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.GT, d[0], d[4]) %}
  | RelationalOp _ ">=" _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.GEQ, d[0], d[4]) %}
  | RelationalOp _ "<" _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.LT, d[0], d[4]) %}
  | RelationalOp _ "<=" _ ConcatOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.LEQ, d[0], d[4]) %}
  | ConcatOp
    {% id %}

EqualityOp ->
  EqualityOp _ "==" _ RelationalOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.EQ, d[0], d[4]) %}
  | EqualityOp _ "!=" _ RelationalOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.NEQ, d[0], d[4]) %}
  | RelationalOp
    {% id %}

LogicalAndExpr ->
  LogicalAndExpr _ "&&" _ EqualityOp
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.And, d[0], d[4]) %}
  | EqualityOp
    {% id %}

LogicalOrExpr ->
  LogicalOrExpr _ "||" _ LogicalAndExpr
    {% (d) => new expr.BinaryOpExpression(expr.BinaryOpKind.Or, d[0], d[4]) %}
  | LogicalAndExpr
    {% id %}
