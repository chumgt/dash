@lexer lexer

FunctionLiteral ->
  "fn" _ Parameters (_ TypeSignature):? _ FunctionBlock
    {% (d) => new expr.FunctionExpression({
      kind: expr.ExpressionKind.Function,
      block: d[5],
      params: d[2],
      returnType: d[3]?.[1]
    }) %}

FunctionDecl ->
  (AnnotationList _):? "fn" __ Name _ Parameters (_ TypeSignature):? _ FunctionBlock
    {% (d) => new stmt.FunctionDeclaration(d[3], d[5], d[8], {
      "annotations": [],
      "returnType": d[10]?.[1]
    }) %}

FunctionBlock ->
  "=>" _ ReturnExpr
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock([]), d[2]) %}
  | ExprBlock
    {% id %}

Arguments ->
  "(" _ ArgumentList _ ")"
    {% nth(2) %}

ArgumentList ->
  ArgumentList _ "," _ Argument {% (d) => [...d[0], d[4]] %}
  | Argument  {% (d) => [d[0]] %}
  | null {% () => [] %}
Argument ->
  ReturnExpr
    {% id %}

Parameters ->
  "(" _ ParameterList _ ")"
    {% nth(2) %}

ParameterList ->
  ParameterList _ "," _ Parameter {% (d) => [...d[0], d[4]] %}
  | Parameter  {% (d) => [d[0]] %}
  | null {% () => [] %}

Parameter ->
  ParameterSignature (_ "=" _ Expr):?
    {% (d) => Object.assign({
      "defaultValue": d[1]?.[3]
    }, d[0]) %}

ParameterSignature ->
  Name (_ TypeSignature):?
    {% (d) => ({
      "name": d[0].value,
      "typedef": d[1]?.[1]
    }) %}
