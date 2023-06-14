
@lexer lex

CallExpr ->
  Expr _ %lparen _ ArgList:? _ %rparen
    {% (d) => ({
      "kind": ExpressionKind.Call,
      "lhs": d[0],
      "args": d[4] ?? []
    }) %}

Function ->
  %lparen _ ParamList:? _ %rparen (_ %colon _ TypeName):? _ %lbrace Chunk %rbrace
    {% (d) => ({
      "kind": ExpressionKind.Function,
      "type": Type.Function,
      "params": d[2] ?? [],
      "returnType": d[5] ? getTypeByName(d[5][3]) : Type.Any,
      "body": d[8]
    }) %}

Arg ->
  Expr
    {% id %}

ArgList ->
  Arg
      {% (d) => [d[0]] %}
  | ArgList _ %comma _ Arg
      {% (d) => {
        return [...d[0], d[4]];
      } %}

ParamList ->
  Param  {% (d) => [d[0]] %}
  | ParamList _ %comma _ Param  {% (d) => [...d[0], d[4]] %}

Param ->
  Identifier (_ %colon _ TypeName):? {% (d) => ({
    "name": d[0].value,
    "type": d[1] ? getTypeByName(d[1][3]) : Type.Any
  }) %}
