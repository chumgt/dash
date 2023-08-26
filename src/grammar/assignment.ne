@{%
  import { AssignmentExpression } from "../expression";
%}

@lexer lex

AssignmentTarget ->
  (DerefExpr | Identifier)
    {% dn(0, 0) %}

# AssignExpr ->
#   AssignmentTarget _ %equals _ Expr
#     {% (d) => ({
#       "kind": ExpressionKind.Assignment,
#       "lhs": d[0],
#       "rhs": d[4]
#     }) %}

# DeclareExpr ->
#   AssignmentTarget _ %colon %colon:? (_ TypeName _):? %equals _ Expr {% (d) => {
#     const token = ({
#       "kind": ExpressionKind.Assignment,
#       "lhs": d[0],
#       "rhs": d[7],
#       "declaration": true,
#       "type": d[4]?.[1]
#     });

#     token["constant"] = !!d[3];

#     return token;
#   } %}

AssignExpr ->
  AssignmentTarget _ (%colon %colon:? (_ Identifier _):?):? %eq _ IfExpr
    {% (d) => new AssignmentExpression(d[0], d[5], d[2]?.[2]?.[1]) %}
  | IfExpr
    {% id %}
