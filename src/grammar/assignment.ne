@include "./function.ne"
@lexer lexer

StaticDeclarationStmt ->
  (Annotations _):? Name _ "::" _ ReturnExpr
    {% (d) => new stmt.DeclarationStatement(d[1], d[5], {
      "annotations": d[0]?.[0],
      "type": undefined,
      "constant": true
    }) %}
  | FunctionDecl
    {% id %}

DeclarationStmt ->
  (Annotations _):? Name _ TypeSignature _ "=" _ ReturnExpr
    {% (d) => new stmt.DeclarationStatement(d[1], d[7], {
      "annotations": d[0]?.[0],
      "type": d[3],
      "constant": false
    }) %}
  | (Annotations _):? Name _ ":=" _ ReturnExpr
    {% (d) => new stmt.DeclarationStatement(d[1], d[5], {
      "annotations": d[0]?.[0],
      "type": undefined,
      "constant": false
    }) %}
  | StaticDeclarationStmt
    {% id %}

AssignmentStmt ->
  Reference _ "=" _ Expr
    {% (d) => new stmt.AssignmentStatement(d[0], d[4]) %}
  | DeclarationStmt
    {% id %}
