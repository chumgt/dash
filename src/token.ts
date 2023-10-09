import { DatumType } from "./data.js";
import { BinaryOpKind, Expression, ExpressionKind, ReferenceExpression, TypeExpression } from "./expression.js";
import { Name } from "./node.js";

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
  identifier: Name;
  block: Expression;
  params: ParameterToken[];
  returnType: ExpressionToken;
}

export interface FunctionExprToken extends ExpressionToken {
  block: Expression;
  params: ParameterToken[];
  returnType?: ExpressionToken;
}

export interface NameToken extends Token {
  value: string;
}

export interface ParameterToken extends Token {
  name: NameToken;
  type?: ReferenceExpression | TypeExpression;
  defaultValue?: Expression;
}

export interface SwitchBlockToken extends Token {
  cases: [Expression, Expression][];
  defaultCase?: Expression;
}

export interface TypeToken extends Token {
  records: [Name, ReferenceExpression | TypeExpression][];
}


export interface UnaryOpToken extends ExpressionToken {
  rhs: ExpressionToken;
}

/// Literal values.
export interface LiteralToken extends Token {
  type: DatumType;
  text?: string;
  value: any;
}

export interface NumberLiteralToken extends LiteralToken {
  value: number;
  base: number;
}

export interface StringLiteralToken extends LiteralToken {
  value: string;
}

export function newToken<T extends Token>(token: T): T {
  return token;
}
