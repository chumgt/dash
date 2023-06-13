
@lexer lex

AssignmentTarget ->
  (DerefExpr | Identifier)
    {% dn(0, 0) %}

AssignExpr ->
  AssignmentTarget _ %equals _ Expr
    {% (d) => ({
      "kind": ExpressionKind.Assignment,
      "lhs": d[0],
      "rhs": d[4]
    }) %}

DeclareExpr ->
  AssignmentTarget _ %colon %colon:? (_ TypeName _):? %equals _ Expr {% (d) => {
    const token = ({
      "kind": ExpressionKind.Assignment,
      "lhs": d[0],
      "rhs": d[7],
      "declaration": true,
      "type": d[4]?.[1]
    });

    token["constant"] = !!d[3];

    return token;
  } %}

TypeName ->
  ("string" | "number") {% (d) => getTypeByName(d[0][0].value) %}
