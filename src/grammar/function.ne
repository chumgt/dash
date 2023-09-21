@lexer lexer

Function ->
  %kw_fn _ %lparen _ ParamList _ %rparen (_ %colon _ Primary):? _ FunctionBody
    {% (d) => new expr.FunctionExpression({
      kind: expr.ExpressionKind.Function,
      block: d[9],
      params: d[4],
      returnType: d[7]?.[3]
    }) %}

FunctionDecl ->
  Identifier _ %lparen _ ParamList _ %rparen (_ %colon _ Primary):? _ FunctionBody
    {% (d) => new stmt.FunctionDeclaration(d[0], d[4], d[9], d[7]?.[3]) %}

FunctionBody ->
  BlockExpr
    {% id %}
  | %eq _ ReturnExpr
    {% nth(2) %}

ArgList ->
  Arg  {% (d) => [d[0]] %}
  | ArgList _ %comma _ Arg {% (d) => [...d[0], d[4]] %}
  | null {% () => [] %}

Arg ->
  ReturnExpr
    {% id %}

ParamList ->
  Param  {% (d) => [d[0]] %}
  | ParamList _ %comma _ Param {% (d) => [...d[0], d[4]] %}
  | null {% () => [] %}

Param ->
  ParamSig (_ %eq _ Expr):?
    {% (d) => Object.assign({
      "defaultValue": d[1]?.[3]
    }, d[0]) %}

ParamSig ->
  Identifier (_ %colon _ Identifier):?
    {% (d) => ({
      "name": d[0].value,
      "typedef": d[1]?.[3]
    }) %}
