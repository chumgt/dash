@lexer lexer

FunctionLiteral ->
  "fn" _ "(" _ Parameters:? _ ")" (_ TypeSignature):? _ FunctionBlock
    {% (d) => new expr.FunctionExpression({
      kind: expr.ExpressionKind.Function,
      block: d[9],
      params: d[4]??[],
      returnType: d[7]?.[1]
    }) %}

FunctionDecl ->
  (AnnotationList _):? "fn" __ Name _ "(" _ Parameters:? _ ")" (_ TypeSignature):? _ FunctionBlock
    {% (d) => new stmt.FunctionDeclaration(d[3], d[7]??[], d[12], {
      "annotations": d[0]?.[0],
      "returnType": d[10]?.[1]
    }) %}

FunctionBlock ->
  "=>" _ ReturnExpr
    {% (d) => new expr.BlockExpression(
        new stmt.StatementBlock([]), d[2]) %}
  | ExprBlock
    {% id %}

Arguments ->
  Arguments _ "," _ Argument {% (d) => [...d[0], d[4]] %}
  | Argument  {% (d) => [d[0]] %}
Argument ->
  ReturnExpr
    {% id %}

Parameters ->
  Parameters _ "," _ Parameter {% (d) => [...d[0], d[4]] %}
  | Parameter  {% (d) => [d[0]] %}

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
