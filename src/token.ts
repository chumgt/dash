import { DatumType } from "./data";
import { BinaryOpKind, Expression, ExpressionKind, IdentifierExpression } from "./expression";
import { FunctionBlock } from "./node";

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
  block: FunctionBlock;
  params: ParameterToken[];
  returnType: ExpressionToken;
}

export interface ParameterToken extends Token {
  name: string;
  typedef?: IdentifierExpression;
  defaultValue?: Expression;
}

export interface TypeToken extends Token {
  records: [IdentifierExpression, IdentifierExpression][];
}

export interface UnaryOpToken extends ExpressionToken {
  rhs: ExpressionToken;
}

/// Literal values.
export interface ValueToken extends ExpressionToken {
  type: DatumType;
  value: any;
}

export interface NumberValueToken extends ValueToken {
  value: number;
  base: number;
}

export interface StringValueToken extends ValueToken {
  value: string;
}

export function newToken<T extends Token>(token: T): T {
  return token;
}
