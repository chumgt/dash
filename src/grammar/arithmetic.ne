#
# Grammar for parsing arithmetic expressions, honouring order of operations.
#

@{%
  function newArithmeticExprToken(kind: ExpressionKind, lhs, rhs) {
    const token = ({
      lhs, rhs, kind
    });

    if (token.lhs.constant && token.rhs.constant &&
        token.lhs.type === Type.Number && token.rhs.type === Type.Number) {
      return doArithmeticTokenExpression(token);
    }

    return token;
  }

  function doArithmeticTokenExpression(token): any {
    let value;

    switch (token.kind) {
      case ExpressionKind.Add:
        value = token.lhs.value + token.rhs.value;
        break;
      case ExpressionKind.Subtract:
        value = token.lhs.value - token.rhs.value;
        break;
      case ExpressionKind.Divide:
        value = token.lhs.value / token.rhs.value;
        break;
      case ExpressionKind.Multiply:
        value = token.lhs.value * token.rhs.value;
        break;
      case ExpressionKind.Exponential:
        value = token.lhs.value ** token.rhs.value;
        break;
      default:
        throw new Error("Unknown op " + token.kind)
    }

    return ({
      kind: ExpressionKind.Number,
      type: Type.Number,
      value
    });
  }
%}

@lexer lex

ArithmeticExpr ->
  AdditiveExpr
    {% id %}

AtomicArithmeticExpr ->
  %lparen _ ArithmeticExpr _ %rparen
    {% dn(2) %}
  | ValueExpr
    {% id %}

ExponentialExpr ->
  AtomicArithmeticExpr _ %power _ ExponentialExpr
    {% (d) => newArithmeticExprToken(ExpressionKind.Exponential, d[0], d[4]) %}
  | AtomicArithmeticExpr
    {% id %}

MultiplicativeExpr ->
  MultiplicativeExpr _ %divide _ ExponentialExpr
    {% (d) => newArithmeticExprToken(ExpressionKind.Divide, d[0], d[4]) %}
  | MultiplicativeExpr _ %times _ ExponentialExpr
    {% (d) => newArithmeticExprToken(ExpressionKind.Multiply, d[0], d[4]) %}
  | ExponentialExpr
    {% id %}

AdditiveExpr ->
  AdditiveExpr _ %plus _ MultiplicativeExpr
    {% (d) => newArithmeticExprToken(ExpressionKind.Add, d[0], d[4]) %}
  | AdditiveExpr _ %minus _ MultiplicativeExpr
    {% (d) => newArithmeticExprToken(ExpressionKind.Subtract, d[0], d[4]) %}
  | MultiplicativeExpr
    {% id %}
