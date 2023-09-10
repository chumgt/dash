
@lexer lex

AssignmentStmt ->
  (DeclarationStmt | DestrAssignmentStmt | ReassignmentStmt)
    {% dn(0, 0) %}

AssignmentTarget ->
  DerefExpr
    {% dn(0) %}
  | %lparen _ Expr _ %rparen
    {% dn(2) %}

DeclarationStmt ->
  AssignmentTarget _ %colon %colon:? (_ DerefExpr):? _ %eq _ Expr
    {% (d) => new stmt.DeclarationStatement(d[0], d[8], d[4]?.[1]) %}

ReassignmentStmt ->
  AssignmentTarget _ %eq _ Expr
    {% (d) => new stmt.AssignmentStatement(d[0], d[4]) %}

DestrAssignmentStmt ->
  %lbracket _ DestrLBody _ %rbracket _ %eq _ %lbracket _ DestrRBody _ %rbracket
    {% (d) => new stmt.DestrAssignmentStatement(d[2], d[10]) %}

DestrLBody ->
  Identifier
    {% (d) => [d[0]] %}
  | DestrLBody _ %comma _ Identifier
    {% (d) => [...d[0], d[4]] %}
DestrRBody ->
  Expr
    {% (d) => [d[0]] %}
  | DestrRBody _ %comma _ Expr
    {% (d) => [...d[0], d[4]] %}
