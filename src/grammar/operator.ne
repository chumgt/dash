@{%
  import { UnaryOpToken } from "../token";

  function newBinaryOpToken(kind: ExpressionKind, lhs, rhs) {
    const token = ({
      lhs, rhs, kind
    });
    if (token.lhs.constant && token.rhs.constant)
      return doBinaryOpToken(token);
    return token;
  }

  function newUnaryOpToken(kind: ExpressionKind, rhs) {
    const token = ({
      kind, rhs
    });
    // return (token.rhs.constant)
    //     ? doUnaryOpToken(token);
    //     : token;
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

      case ExpressionKind.And:
        value = token.lhs.value && token.rhs.value;
        break;
      case ExpressionKind.Or:
        value = token.lhs.value || token.rhs.value;
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

ComparativeExpr ->
  EqualityOp {% id %}

ConcatOp ->
  ConcatOp _ %dot %dot _ ArithmeticExpr
    {% (d) => newBinaryOpToken(ExpressionKind.Concat, d[0], d[5]) %}
  | ArithmeticExpr
    {% id %}

RelationalOp ->
  RelationalOp _ %gt _ ConcatOp
    {% (d) => newBinaryOpToken(ExpressionKind.GT, d[0], d[4]) %}
  | RelationalOp _ %gt %eq _ ConcatOp
    {% (d) => newBinaryOpToken(ExpressionKind.GEQ, d[0], d[5]) %}
  | RelationalOp _ %lt _ ConcatOp
    {% (d) => newBinaryOpToken(ExpressionKind.LT, d[0], d[4]) %}
  | RelationalOp _ %lt %eq _ ConcatOp
    {% (d) => newBinaryOpToken(ExpressionKind.LEQ, d[0], d[5]) %}
  | ConcatOp
    {% id %}

EqualityOp ->
  EqualityOp _ %eq %eq _ RelationalOp
    {% (d) => newBinaryOpToken(ExpressionKind.EQ, d[0], d[5]) %}
  | EqualityOp _ %not %eq _ RelationalOp
    {% (d) => newBinaryOpToken(ExpressionKind.NEQ, d[0], d[5]) %}
  | RelationalOp
    {% id %}
