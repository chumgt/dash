
@lexer lex

ListOf[T, V] ->
  $V  {% (d) => [d[0]] %}
  | $T _ %comma _ $V {% (d) => [...d[0][0], d[4]] %}

CallExpr ->
  CallTarget _ %lparen _ ArgList:? _ %rparen
    {% (d) => new expr.CallExpression(d[0], d[4] ?? []) %}

CallTarget ->
  Expr {% id %}

Function ->
  %kw_fn _ %lparen _ ParamList:? _ %rparen (_ %colon _ Identifier):? _ %lbrace _ FunctionBody _ %rbrace
    {% (d) => new expr.FunctionExpression({
      kind: expr.ExpressionKind.Function,
      body: d[11],
      params: d[4]??[]
    }) %}

FunctionBody ->
  (Stmt _ %semi _):* _ Expr
    {% (d) => [...d[0].map(x => x[0]), d[2]] %}

ArgList ->
  Arg  {% (d) => [d[0]] %}
  | ArgList _ %comma _ Arg {% (d) => [...d[0], d[4]] %}

Arg ->
  Expr
    {% id %}

ParamList ->
  Param  {% (d) => [d[0]] %}
  | ParamList _ %comma _ Param {% (d) => [...d[0], d[4]] %}
  # ListOf[ParamList, Param] {% dn(0) %}

Param ->
  Identifier (_ %colon _ Identifier):? (_ %eq _ Expr):? {% (d) => ({
    "name": d[0].value,
    "typedef": d[1]?.[3] ?? undefined,
    "defaultValue": d[2]?.[3]
  }) %}
