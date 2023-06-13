#
# Grammar for parsing arithmetic expressions, honouring order of operations.
#

@{%
  function newArithmeticExprToken(kind: ExpressionKind) {
    return function (d) {
      const token = ({
        "lhs": d[0],
        "rhs": d[4],
        kind
      });

       if (token.lhs.type===Type.Number && token.rhs.type===Type.Number) {
         return doArithmeticTokenExpression(token);
       }

      return token;
    };
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

ParenArithmeticExpr ->
  %lparen _ AdditiveExpr _ %rparen
      {% dn(2) %}
  | ValueExpr
      {% dn(0) %}

ExponentialExpr ->
  ParenArithmeticExpr _ %power _ ExponentialExpr
      {% newArithmeticExprToken(ExpressionKind.Exponential) %}
  | ParenArithmeticExpr
      {% id %}

MultiplicativeExpr ->
  MultiplicativeExpr _ %divide _ ExponentialExpr
      {% newArithmeticExprToken(ExpressionKind.Divide) %}
  | MultiplicativeExpr _ %times _ ExponentialExpr
      {% newArithmeticExprToken(ExpressionKind.Multiply) %}
  | ExponentialExpr
      {% id %}

AdditiveExpr ->
  AdditiveExpr _ %plus _ MultiplicativeExpr
      {% newArithmeticExprToken(ExpressionKind.Add) %}
  | AdditiveExpr _ %minus _ MultiplicativeExpr
      {% newArithmeticExprToken(ExpressionKind.Subtract) %}
  | MultiplicativeExpr
      {% id %}
