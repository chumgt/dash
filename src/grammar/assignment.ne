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

CompoundAssignmentStmt ->
    Ref _ "**=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Exponential) %}
  | Ref _ "/=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Divide) %}
  | Ref _ "*=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Multiply) %}
  | Ref _ "+=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Add) %}
  | Ref _ "-=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Subtract) %}
  | Ref _ "..=" _ Expr
    {% d => new stmt.CompoundAssignmentStatement(d[0], d[4], expr.BinaryOpKind.Concat) %}

AssignmentStmt ->
  Ref _ "=" _ Expr
    {% (d) => new stmt.AssignmentStatement(d[0], d[4]) %}
  | CompoundAssignmentStmt
    {% id %}
  | DeclarationStmt
    {% id %}
