@lexer lexer

FunctionLiteral ->
  ("fn" | "⨍") _ "(" _ Parameters:? _ ")" _ TypeSignature:? _ FunctionBlock
    {% (d) => new expr.FunctionExpression(d[4]??[], d[10], {
      "returnType": d[8]
    }) %}
  | "⨍" LambdaParameter TypeSignature:? _ FunctionBlock
    {% (d) => new expr.FunctionExpression([d[1]], d[4], {
      "returnType": d[2]
    }) %}

FunctionDecl ->
  (Annotations _):? "fn" __ Name _ "(" _ Parameters:? _ ")" (_ TypeSignature):? _ FunctionBlock
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

LambdaParameter ->
  Name {% (d) => ({ name: d[0] }) %}

Parameters ->
    Parameters _ "," _ Parameter {% (d) => [...d[0], d[4]] %}
  | Parameter  {% (d) => [d[0]] %}
Parameter ->
  Name _ TypeSignature:? (_ "=" _ Expr):?
    {% (d) => tokenize<tokens.ParameterToken>({
      "name": d[0],
      "defaultValue": d[3]?.[3],
      "type": d[2]
    }) %}
