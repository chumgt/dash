@lexer lexer

AssignmentStmt ->
  DeclarationStmt       {% id %}
  # | DestrAssignmentStmt {% id %}
  | ReassignmentStmt    {% id %}

DeclarationStmt ->
  AnnotationList _ Identifier _ %colon %colon:? (_ Primary):? _ %eq _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[2], d[10], {
      "annotations": d[0],
      "returnType": d[6]?.[1]
    }) %}
  | FunctionDecl
    {% id %}

ReassignmentStmt ->
  Reference _ %eq _ Expr
    {% (d) => new stmt.AssignmentStatement(d[0], d[4]) %}

DestrAssignmentStmt ->
  %lbracket _ DestrLBody _ %rbracket _ %eq _ %lbracket _ DestrRBody _ %rbracket
    {% (d) => new stmt.DestrAssignmentStatement(d[2], d[10]) %}

Annotation ->
  %at Primary
    {% nth(1) %}
AnnotationList ->
  AnnotationList __ Annotation {% (d) => [...d[0], d[2]] %}
  | Annotation {% (d) => [d[0]] %}
  | null {% () => [] %}

DestrLBody ->
  DestrLBody _ %comma _ Identifier
    {% (d) => [...d[0], d[4]] %}
  | Identifier
    {% (d) => [d[0]] %}
DestrRBody ->
  DestrRBody _ %comma _ Expr
    {% (d) => [...d[0], d[4]] %}
  | Expr
    {% (d) => [d[0]] %}
