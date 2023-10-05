@include "./function.ne"
@lexer lexer

StaticDeclarationStmt ->
  (AnnotationList _):? Name _ ":" ":" _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[1], d[9], {
      "annotations": d[0]?.[0],
      "type": d[5]?.[1],
      "constant": true
    }) %}
  | FunctionDecl
    {% id %}

DeclarationStmt ->
  (AnnotationList _):? Name _ ":" TypeSignature:? _ "=" _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[1], d[8], {
      "annotations": d[0]?.[0],
      "type": d[4],
      "constant": true
    }) %}
  | (AnnotationList _):? Name _ ":" ":" _ "=" _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[1], d[8], {
      "annotations": d[0]?.[0],
      "type": undefined,
      "constant": true
    }) %}
  | (AnnotationList _):? Name _ TypeSignature _ "=" _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[1], d[7], {
      "annotations": d[0]?.[0],
      "type": d[3],
      "constant": false
    }) %}
  | (AnnotationList _):? Name _ ":" "=" _ ExprBlock
    {% (d) => new stmt.DeclarationStatement(d[1], d[6], {
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
