
@lexer lex

ListOf[T, V] ->
  $V  {% (d) => [d[0]] %}
  | $T _ %comma _ $V {% (d) => [...d[0], d[4]] %}


CallExpr ->
  CallTarget _ %lparen _ ArgList:? _ %rparen
    {% (d) => new CallExpression(d[0], d[4]) %}
    # {% (d) => ({
    #   "kind": ExpressionKind.Call,
    #   "lhs": d[0],
    #   "args": d[4] ?? []
    # }) %}

CallTarget ->
  Function  {%id%}
  | ValueExpr {%id%}

Function ->
  "fn" _ %lparen _ ParamList:? _ %rparen (_ %colon _ TypeName):? _ %lbrace FunctionBody %rbrace
    {% (d) => new FunctionExpression({
      kind: ExpressionKind.Function,
      body: d[10]
    }) %}
    # {% (d) => ({
    #   "kind": ExpressionKind.Function,
    #   "type": Type.Function,
    #   "params": d[2] ?? [],
    #   "returnType": d[5]?.[3] ?? Type.Any,
    #   "body": d[8]
    # }) %}

FunctionBody ->
  _ Expr _
    {% (d) => [d[1]] %}
  | FunctionBody _ %semi _ Expr _
      {% (d) => [...d[0], d[4]] %}

Arg ->
  ValueExpr
    {% id %}

ArgList ->
  Arg {% (d) => ([d[0]]) %}
  | ArgList _ %comma _ Arg {% (d) => [...d[0], d[4]] %}

ParamList ->
  ListOf[ParamList, Param] {% id %}

# ParamList ->
#   Param  {% (d) => [d[0]] %}
#   | ParamList _ %comma _ Param  {% (d) => [...d[0], d[4]] %}

Param ->
  Identifier (_ %colon _ Identifier):? {% (d) => ({
    "name": d[0].value,
    "type": d[1]?.[3] ?? Type.Any
  }) %}
