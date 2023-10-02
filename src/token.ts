import { DatumType } from "./data.js";
import { BinaryOpKind, Expression, ExpressionKind, IdentifierExpression, TypeExpression } from "./expression.js";

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

export interface StatementToken extends Token { }

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

export interface FunctionDeclToken extends StatementToken {
  identifier: IdentifierExpression;
  block: Expression;
  params: ParameterToken[];
  returnType: ExpressionToken;
}

export interface FunctionExprToken extends ExpressionToken {
  block: Expression;
  params: ParameterToken[];
  returnType: ExpressionToken;
}

export interface ParameterToken extends Token {
  name: string;
  typedef?: IdentifierExpression;
  defaultValue?: Expression;
}

export interface SwitchBlockToken extends Token {
  cases: [Expression, Expression][];
  defaultCase?: Expression;
}

export interface TypeToken extends Token {
  records: [IdentifierExpression, IdentifierExpression | TypeExpression][];
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
