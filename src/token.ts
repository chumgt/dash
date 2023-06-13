import { Type } from "./data";
import { ExpressionKind } from "./expression";

export interface TokenSource {
  text: string;
  location: {
    column: number;
    line: number;
  };
}

export interface Token {
  kind: ExpressionKind;
  source?: TokenSource;
}

export interface ExpressionToken extends Token { }

export interface BinaryOpToken extends ExpressionToken {
  lhs: Token;
  rhs: Token;
}

export interface DerefToken extends BinaryOpToken { }

/// Literal values.
export interface ValueToken extends ExpressionToken {
  type: Type;
  value: any;
}

export interface InfinityToken extends Token {

}
