@{%
  function newBinaryOpToken(kind: ExpressionKind, lhs, rhs) {
    const token = ({
      lhs, rhs, kind
    });
    if (token.lhs.constant && token.rhs.constant)
      return doBinaryOpToken(token);
    return token;
  }

  function doBinaryOpToken(token): any {
    let value;

    switch (token.kind) {
      case ExpressionKind.Concat:
        value = String(token.lhs.value) + String(token.rhs.value);
        break;
      case ExpressionKind.EQ:
        value = token.lhs.value === token.rhs.value;
        break;
      case ExpressionKind.NEQ:
        value = token.lhs.value !== token.rhs.value;
        break;
      case ExpressionKind.GT:
        value = token.lhs.value > token.rhs.value;
        break;
      case ExpressionKind.GEQ:
        value = token.lhs.value >= token.rhs.value;
        break;
      case ExpressionKind.LT:
        value = token.lhs.value < token.rhs.value;
        break;
      case ExpressionKind.LEQ:
        value = token.lhs.value <= token.rhs.value;
        break;
      default:
        throw new Error("Idk that op " + token.kind)
    }

    return ({
      ...token,
      value
    });
  }
%}

@lexer lex

BinaryExpr ->
  (OpConcat | LogicOp)
    {% dn(0, 0) %}

OpConcat ->
  Expr _ %concat _ Expr
    {% (d) => newBinaryOpToken(ExpressionKind.Concat, d[0], d[4]) %}

Operand ->
  %lparen _ Expr _ %rparen
    {% dn(2) %}
  | ValueExpr
    {% id %}

RelationalOp ->
  RelationalOp _ %gt _ Operand
    {% (d) => newBinaryOpToken(ExpressionKind.GT, d[0], d[4]) %}
  | RelationalOp _ %gt %eq _ Operand
    {% (d) => newBinaryOpToken(ExpressionKind.GEQ, d[0], d[5]) %}
  | RelationalOp _ %lt _ Operand
    {% (d) => newBinaryOpToken(ExpressionKind.LT, d[0], d[4]) %}
  | RelationalOp _ %lt %eq _ Operand
    {% (d) => newBinaryOpToken(ExpressionKind.LEQ, d[0], d[5]) %}
  | Operand
    {% id %}

EqualityOp ->
  EqualityOp _ %eq %eq _ RelationalOp
    {% (d) => newBinaryOpToken(ExpressionKind.EQ, d[0], d[5]) %}
  | EqualityOp _ %neq _ RelationalOp
    {% (d) => newBinaryOpToken(ExpressionKind.NEQ, d[0], d[4]) %}
  | RelationalOp
    {% id %}

LogicOp ->
  LogicOp _ %and _ EqualityOp
    {% (d) => newBinaryOpToken(ExpressionKind.And, d[0], d[4]) %}
  | LogicOp _ %or _ EqualityOp
    {% (d) => newBinaryOpToken(ExpressionKind.Or, d[0], d[4]) %}
  | EqualityOp
    {% id %}
