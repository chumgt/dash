
@lexer lex

CallExpr ->
  CallTarget _ %lparen _ ArgList:? _ %rparen
    {% (d) => new expr.CallExpression(d[0], d[4] ?? []) %}

CallTarget ->
  DerefExpr {% id %}

Function ->
  %kw_fn _ %lparen _ ParamList:? _ %rparen (_ %colon _ Identifier):? _ %lbrace _ FunctionBlock _ %rbrace
    {% (d) => new expr.FunctionExpression({
      kind: expr.ExpressionKind.Function,
      block: d[11],
      params: d[4] ?? [],
      returnType: d[7]?.[3]
    }) %}

FunctionBlock ->
  ProcBody:? _ Expr
    {% (d) => new node.FunctionBlock(d[0] ?? [], d[2]) %}

ArgList ->
  Arg  {% (d) => [d[0]] %}
  | ArgList _ %comma _ Arg {% (d) => [...d[0], d[4]] %}

Arg ->
  Expr
    {% id %}

ParamList ->
  Param  {% (d) => [d[0]] %}
  | ParamList _ %comma _ Param {% (d) => [...d[0], d[4]] %}

Param ->
  Identifier (_ %colon _ Identifier):? (_ %eq _ Expr):?
    {% (d) => ({
      "name": d[0].value,
      "typedef": d[1]?.[3] ?? undefined,
      "defaultValue": d[2]?.[3]
    }) %}
