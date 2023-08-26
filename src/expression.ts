
export enum ExpressionKind {
  /* TODO: These are strings for development as it makes it easier to read the
   * AST, but should be numbers in production.
   */

  Number = "Number",
  Identifier = "Identifier",
  Function = "Function",
  String = "String",
  Add = "Add",
  Divide = "Divide",
  Exponential = "Exponential",
  Multiply = "Multiply",
  Subtract = "Subtract",
  Negate = "Negate",

  Concat = "Concat",

  Parameter = "Param",

  EQ = "Equal",
  NEQ = "NotEqual",
  LT = "LessThan",
  LEQ = "LessThanOrEqual",
  GT = "GreaterThan",
  GEQ = "GreaterThanOrEqual",
  And = "BinAnd",
  Or = "BinOr",

  If = "If",

  Assignment = "Assignment",
  Dereference = "Dereference",
  Call = "Call",
  Cast = "Cast",
  TypeName = "TypeName",

  Comment = "Comment"
}

// export interface Expression {
//   kind: ExpressionKind;
//   /** A *constant* expression is one that always produces the same result.
//     *
//     * All literals are intrinsically constant; the value of `3.14`, `true`, and
//     * `"Hello, world"`, can never change.
//     */
//   constant: boolean;
// }

export class ExpressionSourceBuilder {
  public sourceString = "";

  public visit(expr: Expression): string {
    return this.sourceString += expr.getSource();
  }
}

export abstract class Expression {
  // public readonly kind: ExpressionKind;
  public constructor(public readonly kind: ExpressionKind) { }

  public abstract accept(v: ExpressionSourceBuilder): void;
  public abstract getSource(): string;
}

export abstract class BinaryExpression extends Expression {
  lhs: Expression;
  rhs: Expression;

  public constructor(kind: ExpressionKind, lhs: Expression, rhs: Expression) {
    super(kind);
    this.lhs = lhs;
    this.rhs = rhs;
  }
}

export class AddExpression extends BinaryExpression {
  public constructor(lhs: Expression, rhs: Expression) {
    super(ExpressionKind.Add, lhs, rhs);
  }

  public accept(v: ExpressionSourceBuilder): void {
    v.sourceString += "(";
    this.lhs.accept(v);
    this.rhs.accept(v);
    v.sourceString += ")";
  }

  public getSource(): string {
    return `(${this.lhs.getSource()}+${this.rhs.getSource()})`;
  }
}
