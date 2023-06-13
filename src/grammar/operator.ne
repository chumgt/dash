@{%
  function newBinaryOpToken(kind: ExpressionKind) {
    return function (d) {
      const token = ({
        "lhs": d[0],
        "rhs": d[5], // TODO THIS SHOULD NOT BE 5
        kind
      });

      if (token.lhs.constant && token.rhs.constant)
        return doBinaryOpToken(token);
      return token;
    };
  }

  function doBinaryOpToken(token): any {
    let value;

    switch (token.kind) {
      case ExpressionKind.Equal:
        value = token.lhs.value === token.rhs.value;
        break;
      default:
        throw new Error("Idk that op " + token.kind)
    }

    return ({
      "kind": ExpressionKind.Any,
      "constant": true,
      value
    });
  }
%}

@lexer lex

BinaryExpr ->
  (OpConcat | OpEQ | OpLE | OpLT)
    {% dn(0, 0) %}

BinaryOp[T] ->
  Expr _ $T _ Expr {% (d) => ({
    "lhs": d[0],
    "rhs": d[4]
  }) %}

OpConcat ->
  BinaryOp[%concat] {% (d) => {
    if (d[0].lhs.constant && d[0].rhs.constant) {
      return ({
        "kind": ExpressionKind.String,
        "value": String(d[0].lhs.value) + String(d[0].rhs.value)
      });
    }
    return ({
      "kind": ExpressionKind.Concat,
      "lhs": d[0].lhs,
      "rhs": d[0].rhs
    });
  } %}
  # Expr _ %concat _ Expr {% (d) => {
  #   if (d[0].constant && d[4].constant) {
  #     return ({
  #       "kind": ExpressionKind.String,
  #       "source": d[0].source,
  #       "constant": true,
  #       "value": d[0].value + d[4].value
  #     });
  #   }
  #   return ({
  #     "kind": ExpressionKind.Concat,
  #     "lhs": d[0],
  #     "rhs": d[4]
  #   })
  # } %}

OpEQ ->
  Expr _ %equals %equals _ Expr
    {% newBinaryOpToken(ExpressionKind.Equal) %}
  # {% (d) => ({
  #   "kind": ExpressionKind.Equal,
  #   "lhs": d[0],
  #   "rhs": d[4]
  # }) %}

OpLE ->
  Expr _ %leq _ Expr {% (d) => ({
    "kind": ExpressionKind.LEQ,
    "lhs": d[0],
    "rhs": d[4]
  }) %}

OpLT ->
  Expr _ %lt _ Expr {% (d) => ({
    "kind": ExpressionKind.LessThan,
    "lhs": d[0],
    "rhs": d[4]
  }) %}
