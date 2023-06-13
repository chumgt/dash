
@lexer lex

# FunctionCall ->
#   Expr _ "|" (_ Expr):*
#     {% (d) => ({
#       "kind": ExpressionKind.Experimental,
#       "lhs": d[0],
#       "rhs": d[3]?.map(x => x[1])
#     }) %}

# FunctionDecl ->
#   ParamList

FunctionCall ->
  Expr _ %lparen _ ArgList:? _ %rparen
    {% (d) => ({
      "kind": ExpressionKind.FunctionCall,
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

ArgList ->
  Expr
      {% (d) => [d[0]] %}
  | ArgList _ %comma _ Expr
      {% (d) => {
        return [...d[0], d[4]];
      } %}

ParamList ->
  Param
      {% (d) => [d[0]] %}
  | ParamList _ %comma _ Param
      {% (d) => {
        return [...d[0], d[4]];
      } %}

Param ->
  Identifier (_ %colon _ TypeName):? {% (d) => ({
    "name": d[0].value,
    "type": d[1] ? getTypeByName(d[1][3]) : Type.Any
  }) %}
