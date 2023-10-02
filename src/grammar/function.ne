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
  %kw_fn __ Identifier _ %lparen _ ParamList _ %rparen (_ %colon _ Primary):? _ FunctionBody
    {% (d) => new stmt.FunctionDeclaration(d[2], d[6], d[11], d[9]?.[3]) %}

FunctionBody ->
  %eq _ Expr
    {% nth(2) %}
  | ExprBlock
    {% id %}

ArgList ->
  ArgList _ %comma _ Arg {% (d) => [...d[0], d[4]] %}
  | Arg  {% (d) => [d[0]] %}
  | null {% () => [] %}

Arg ->
  Expr
    {% id %}

ParamList ->
  ParamList _ %comma _ Param {% (d) => [...d[0], d[4]] %}
  | Param  {% (d) => [d[0]] %}
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
