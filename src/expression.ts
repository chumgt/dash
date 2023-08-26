import { Type, Value } from "./data";
import { DashError } from "./error";
import { AssignmentExprToken, ExpressionToken, FunctionExprToken, ParameterToken, Token, ValueToken } from "./token";
import { Vm } from "./vm";

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

  Comment = "Comment",
  Value = "Value",
  BinaryOp = "BinOp",
  UnaryOp = "UnaryOp"
}

export enum BinaryOpKind {
  Concat,
  Dereference,
  Multiply,
  Add,
  Divide,
  Exponential,
  Subtract,

  EQ,
  NEQ,
  GT,
  GEQ,
  LT,
  LEQ,
  And,
  Or
}

export enum UnaryOpKind {
  Negate
}

export enum ValueKind {
  Number,
  String
}

export interface ExpressionTypeMap extends Record<ExpressionKind, Expression> {
  [ExpressionKind.Assignment]: AssignmentExpression;
  [ExpressionKind.Value]: ValueExpression;
}

export interface TokenTypeMap extends Record<ExpressionKind, ExpressionToken> {
  [ExpressionKind.Assignment]: AssignmentExprToken;
  [ExpressionKind.Value]: ValueToken;
}

export class ExpressionBuilder {
  public build<K extends keyof TokenTypeMap>(token: TokenTypeMap[K]): ExpressionTypeMap[K];
  public build(token: Token): Expression;
  public build(token: ExpressionToken): Expression {
    switch (token.kind) {
      case ExpressionKind.Assignment: {
        const as = token as AssignmentExprToken;
        const expr = new AssignmentExpression(
            this.build(as.lhs) as any,
            this.build(as.rhs));
        if (as.typedef)
          expr.type = this.build(as.typedef);
        return expr;
      }
    }

    throw new Error(`Unknown token kind ${token.kind}`);
  }
}

export interface AssignmentTarget {
  assign(value: Value, vm: Vm): void;
}

export interface DereferenceTarget {
  dereference(key: Value): Value;
}

export abstract class Expression {
  public constructor(public readonly kind: ExpressionKind) { }
  public abstract apply(vm: Vm): Value;
}

export class AssignmentExpression extends Expression {
  target: AssignmentTarget;
  type?: Expression;
  value: Expression;

  public constructor(target: AssignmentTarget, value: Expression, type?: Expression) {
    super(ExpressionKind.Assignment);
    this.target = target;
    this.value = value;
    this.type = type;
  }

  public override apply(vm: Vm): Value {
    const value = this.value.apply(vm);
    this.target.assign(value, vm);
    return value;
  }
}

export class BinaryOpExpression extends Expression {
  op: BinaryOpKind;
  lhs: Expression;
  rhs: Expression;

  public constructor(op: BinaryOpKind, lhs: Expression, rhs: Expression) {
    super(ExpressionKind.BinaryOp);
    this.op = op;
    this.lhs = lhs;
    this.rhs = rhs;
  }

  public override apply(vm: Vm): Value {
    if (this.op === BinaryOpKind.Concat) {
      const lhs = this.lhs.apply(vm);
      const rhs = this.rhs.apply(vm);
      return new Value(Type.String, String(lhs.data) + String(rhs.data));
    }
    else if (this.op & (BinaryOpKind.Add | BinaryOpKind.Divide | BinaryOpKind.Multiply | BinaryOpKind.Subtract)) {
      return BinaryArithmeticExpression.prototype.apply.call(this, vm);
    }

    throw new Error("unknown op");
  }
}

export class BinaryArithmeticExpression extends BinaryOpExpression {
  public override apply(vm: Vm): Value {
    const lhs = this.lhs.apply(vm);
    if (lhs.type !== Type.Number)
      throw new DashError("lhs is not a number");

    const rhs = this.rhs.apply(vm);
    if (rhs.type !== Type.Number)
      throw new DashError("rhs is not a number");

    switch (this.op) {
      case BinaryOpKind.Add:
        return new Value(Type.Number, lhs.data + rhs.data);
      case BinaryOpKind.Multiply:
        return new Value(Type.Number, lhs.data * rhs.data);
      default:
        throw new DashError("unknown arithmetic operator");
    }
  }
}

export class UnaryOpExpression extends Expression {
  op: UnaryOpKind;
  rhs: Expression;

  public constructor(op: UnaryOpKind, rhs: Expression) {
    super(ExpressionKind.UnaryOp);
    this.op = op;
    this.rhs = rhs;
  }

  public override apply(vm: Vm): Value {
    const rhs = this.rhs.apply(vm);
    if (rhs.type !== Type.Number)
      throw new DashError("value is not a number");
    return new Value(Type.Number, -rhs.data);
  }
}

export class CallExpression extends Expression {
  target: Expression;
  args: Expression[];

  public constructor(target: Expression, args: Expression[]) {
    super(ExpressionKind.Call);
    this.target = target;
    this.args = args;
  }

  public override apply(vm: Vm): Value {
    const target = this.target.apply(vm);
    if (target.type !== Type.Function)
      throw new DashError("target is not callable");
    return target.data();
  }
}

export class CastExpression extends Expression {
  type: Expression;
  value: Expression;

  public constructor(type: Expression, value: Expression) {
    super(ExpressionKind.Cast);
    this.type = type;
    this.value = value;
  }

  public override apply(vm: Vm): Value {
    // const type = this.type.apply(vm);
    const value = this.value.apply(vm);

    if (value.type === Type.String) {
      return new Value(Type.Number, Number(value.data));
    }
    throw new DashError("What types??");
  }
}

export class DereferenceExpression extends BinaryOpExpression
implements AssignmentTarget {
  declare rhs: IdentifierExpression;

  public constructor(lhs: Expression, rhs: IdentifierExpression) {
    super(BinaryOpKind.Dereference, lhs, rhs);
  }

  public override apply(vm: Vm): Value {
    const lhs = this.lhs.apply(vm);
    // const rhs = this.rhs.apply(vm);
    return lhs.properties[this.rhs.value];
  }

  public assign(value: Value, vm: Vm): void {
    const lhs = this.lhs.apply(vm);
    // const rhs = this.rhs.apply(vm);
    lhs.properties[this.rhs.value] = value;
  }
}

export class FunctionExpression extends Expression {
  body: Expression[];
  params: ParameterToken[];

  public constructor(token: FunctionExprToken) {
    super(ExpressionKind.Function);
    this.body = token.body as Expression[];
  }

  public override apply(vm: Vm): Value {
    const context = vm.save();
    return new Value(Type.Function, () => {
      let result: Value;
      for (let expr of this.body)
        result = expr.apply(context);
      return result!;
    });
  }
}

export class IdentifierExpression extends Expression
implements AssignmentTarget {
  value: string;

  public constructor(value: string) {
    super(ExpressionKind.Identifier);
    this.value = value;
  }

  public override apply(vm: Vm): Value {
    return vm.get(this.value);
  }

  public assign(value: Value, vm: Vm): void {
    vm.assign(this.value, value);
  }
}

export class IfExpression extends Expression {
  public constructor(
      public condition: Expression,
      public tResult: Expression,
      public fResult: Expression) {
    super(ExpressionKind.If);
  }

  public override apply(vm: Vm): Value {
    const cond = this.condition.apply(vm);
    return (cond.data)
        ? this.tResult.apply(vm)
        : this.fResult.apply(vm);
  }
}

export class ValueExpression extends Expression {
  type: Type;
  value: any;

  public constructor(type: Type, value: any) {
    super(ExpressionKind.Value);
    this.type = type;
    this.value = value;
  }

  public override apply(vm: Vm): Value {
    return new Value(this.type, this.value);
  }
}

// export class AddExpression extends BinaryExpression {
//   public constructor(lhs: Expression, rhs: Expression) {
//     super(ExpressionKind.Add, lhs, rhs);
//   }

//   public accept(v: ExpressionSourceBuilder): void {
//     v.sourceString += "(";
//     this.lhs.accept(v);
//     this.rhs.accept(v);
//     v.sourceString += ")";
//   }

//   public getSource(): string {
//     return `(${this.lhs.getSource()}+${this.rhs.getSource()})`;
//   }
// }
