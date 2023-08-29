
@lexer lex

AssignmentTarget ->
  DerefExpr
    {% dn(0) %}
  | %lparen _ Expr _ %rparen
    {% dn(2) %}

DeclarationStmt ->
  AssignmentTarget _ %colon %colon:? (_ TypeName):? _ %eq _ Expr
    {% (d) => new expr.DeclarationExpression(d[0], d[8], d[4]?.[1]) %}

AssignmentExpr ->
  AssignmentTarget _ %eq _ Expr
    {% (d) => new expr.AssignmentExpression(d[0], d[4]) %}
