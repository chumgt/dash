import { Type } from "./data";
import { BinaryOpKind, ExpressionKind } from "./expression";

export interface TokenSource {
  text: string;
  location: {
    column: number;
    line: number;
  };
}

export interface Token {
  source?: TokenSource;
}

export interface ExpressionToken extends Token {
  kind: ExpressionKind;
}

export interface AssignmentExprToken extends ExpressionToken {
  lhs: ExpressionToken;
  rhs: ExpressionToken;
  typedef?: ExpressionToken;
}

export interface BinaryOpToken extends ExpressionToken {
  op: BinaryOpKind;
  lhs: ExpressionToken;
  rhs: ExpressionToken;
}

export interface FunctionExprToken extends ExpressionToken {
  body: ExpressionToken[];
  // params: ExpressionToken[];
  // returnType: ExpressionToken;
}

export interface ParameterToken extends Token {

}

export interface UnaryOpToken extends ExpressionToken {
  rhs: ExpressionToken;
}

/// Literal values.
export interface ValueToken extends ExpressionToken {
  type: Type;
  value: any;
}

export function newToken<T extends Token>(token: T): T {
  return token;
}
