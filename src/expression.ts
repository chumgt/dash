import { DashError } from "./error";
import { AssignmentTarget, Node } from "./node";
import { AssignmentExprToken, ExpressionToken, FunctionExprToken, ParameterToken, Token, TypeToken, ValueToken } from "./token";
import { Type } from "./type";
import { Value } from "./value";
import { Vm } from "./vm";
import * as data from "./data";

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
  Switch = "Switch",

  Assignment = "Assignment",
  Declaration = "Dec",
  Dereference = "Dereference",
  Call = "Call",
  Cast = "Cast",
  TypeName = "TypeName",

  Comment = "Comment",
  Type = "Type",
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

// export class ExpressionBuilder {
//   public build<K extends keyof TokenTypeMap>(token: TokenTypeMap[K]): ExpressionTypeMap[K];
//   public build(token: Token): Expression;
//   public build(token: ExpressionToken): Expression {
//     switch (token.kind) {
//       case ExpressionKind.Assignment: {
//         const as = token as AssignmentExprToken;
//         const expr = new AssignmentExpression(
//             this.build(as.lhs) as any,
//             this.build(as.rhs));
//         if (as.typedef)
//           expr.type = this.build(as.typedef);
//         return expr;
//       }
//     }

//     throw new Error(`Unknown token kind ${token.kind}`);
//   }
// }

export abstract class Expression extends Node {
  public constructor(public kind: ExpressionKind) {
    super();
  }
  public abstract evaluate(vm: Vm): Value;
}

export class AssignmentExpression extends Expression {
  public static readonly FLAG_DECLARE = 1 << 0;
  target: AssignmentTarget;
  value: Expression;

  public constructor(target: AssignmentTarget, value: Expression,
      public flags: number = 0) {
    super(ExpressionKind.Assignment);
    this.target = target;
    this.value = value;
  }

  public override evaluate(vm: Vm): Value {
    const key = this.target.getKey();
    if ((this.flags & AssignmentExpression.FLAG_DECLARE) && vm.has(key))
      throw new DashError(`var ${key} already defined`);
    const value = this.value.evaluate(vm);
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

  public override evaluate(vm: Vm): Value {
    const lhs = this.lhs.evaluate(vm);
    const rhs = this.rhs.evaluate(vm);
    if (this.op === BinaryOpKind.Concat) {
      return new Value(data.Type.String, String(lhs.data) + String(rhs.data));
    }
    else if ([BinaryOpKind.Add, BinaryOpKind.Divide, BinaryOpKind.Exponential, BinaryOpKind.Multiply, BinaryOpKind.Subtract].includes(this.op)) {
      if (lhs.type !== rhs.type)
        throw new DashError(`cannot do ${this.op} on ${lhs.type} and ${rhs.type}`);

      switch (this.op) {
        case BinaryOpKind.Add:
          return new Value(data.Type.Number, lhs.data + rhs.data);
        case BinaryOpKind.Divide:
          return new Value(data.Type.Number, lhs.data / rhs.data);
        case BinaryOpKind.Exponential:
          return new Value(data.Type.Number, lhs.data ** rhs.data);
        case BinaryOpKind.Multiply:
          return new Value(data.Type.Number, lhs.data * rhs.data);
        case BinaryOpKind.Subtract:
          return new Value(data.Type.Number, lhs.data - rhs.data);
        default:
          throw new DashError("unknown arithmetic operator");
      }
    }
    else if ([BinaryOpKind.EQ, BinaryOpKind.NEQ, BinaryOpKind.GT, BinaryOpKind.GEQ, BinaryOpKind.LT, BinaryOpKind.LEQ].includes(this.op)) {
      if (lhs.type !== rhs.type)
        throw new DashError(`cannot do ${this.op} on ${lhs.type} and ${rhs.type}`);

      switch (this.op) {
        case BinaryOpKind.GT:
          return new Value(data.Type.Number, lhs.data > rhs.data ? 1 : 0);
        case BinaryOpKind.GEQ:
          return new Value(data.Type.Number, lhs.data >= rhs.data ? 1 : 0);
        case BinaryOpKind.LT:
          return new Value(data.Type.Number, lhs.data < rhs.data ? 1 : 0);
        case BinaryOpKind.LEQ:
          return new Value(data.Type.Number, lhs.data <= rhs.data ? 1 : 0);
        case BinaryOpKind.EQ:
          return new Value(data.Type.Number, lhs.data === rhs.data ? 1 : 0);
        case BinaryOpKind.NEQ:
          return new Value(data.Type.Number, lhs.data !== rhs.data ? 1 : 0);
      }
    }

    throw new Error("unknown op");
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

  public override evaluate(vm: Vm): Value {
    const rhs = this.rhs.evaluate(vm);
    if (rhs.type !== data.Type.Number)
      throw new DashError("value is not a number");
    return new Value(data.Type.Number, -rhs.data);
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

  public override evaluate(vm: Vm): Value {
    const target = this.target.evaluate(vm);
    if (target.type !== data.Type.Function)
      throw new DashError("target is not callable");
    // const args = this.args.map(x => x.apply(vm));
    const args = mapArgsToParams(this.args, target.params)
    //     .map(x => x.apply(vm));
    // return target.data(args);
    return target.data(args)
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

  public override evaluate(vm: Vm): Value {
    const type = this.type.evaluate(vm);
    if (type.type !== data.Type.Type)
      throw new DashError("cast to non-type");

    const value = this.value.evaluate(vm);
    return vm.cast(value, type.data);
  }
}

export class DeclarationExpression extends AssignmentExpression {
  public constructor(target: AssignmentTarget, value: Expression,
      public type?: Expression) {
    super(target, value);
    this.kind = ExpressionKind.Declaration;
  }

  public override evaluate(vm: Vm): Value {
    const value = this.value.evaluate(vm);
    this.target.assign(value, vm);
    return value;
  }
}

export class DereferenceExpression extends BinaryOpExpression
implements AssignmentTarget {
  declare rhs: IdentifierExpression;

  public constructor(lhs: Expression, rhs: IdentifierExpression) {
    super(BinaryOpKind.Dereference, lhs, rhs);
  }

  public override evaluate(vm: Vm): Value {
    const lhs = this.lhs.evaluate(vm);
    // const rhs = this.rhs.apply(vm);
    return lhs.properties[this.rhs.value];
  }

  public assign(value: Value, vm: Vm): void {
    const lhs = this.lhs.evaluate(vm);
    // const rhs = this.rhs.apply(vm);
    lhs.properties[this.rhs.value] = value;
  }

  public getKey() {
    return this.rhs.getKey();
  }
}

export class FunctionExpression extends Expression {
  body: Expression[];
  params: ParameterToken[];
  private context: Vm;

  public constructor(token: FunctionExprToken) {
    super(ExpressionKind.Function);
    this.body = token.body as Expression[];
    this.params = token.params;
  }

  public override evaluate(vm: Vm): Value {
    const context = vm.save();
    const val = new Value(data.Type.Function, (args: Expression[]) => {
      return this.call(context, args);
    });
    val.params = this.params;
    return val;
  }

  public call(vm: Vm, args: Expression[]): Value {
    if (! Array.isArray(args))
      throw new DashError(`expected args array, received ${typeof args}`);
    if (args.length !== this.params.length)
      throw new DashError("incorrect arg count");

    for (let i = 0; i < args.length; i++) {
      const arg = args[i].evaluate(vm);
      const param = this.params[i];

      if (param.typedef) {
        const expectedType = param.typedef?.evaluate(vm);
        if (! (arg.type & expectedType.type))
          throw new DashError(`arg ${i}: expected ${expectedType.type}, received ${arg.type}`);
      }

      vm.assign(param.name, arg);
    }

    let result: Value;
    for (let expr of this.body)
      result = expr.evaluate(vm);
    return result!;
  }
}

export class IdentifierExpression extends Expression
implements AssignmentTarget {
  value: string;

  public constructor(value: string) {
    super(ExpressionKind.Identifier);
    this.value = value;
  }

  public override evaluate(vm: Vm): Value {
    return vm.get(this.value);
  }

  public assign(value: Value, vm: Vm): void {
    vm.assign(this.getKey(), value);
  }

  public getKey() {
    return this.value;
  }
}

export class IfExpression extends Expression {
  public constructor(
      public condition: Expression,
      public tResult: Expression,
      public fResult: Expression) {
    super(ExpressionKind.If);
  }

  public override evaluate(vm: Vm): Value {
    const cond = this.condition.evaluate(vm);
    return (cond.data)
        ? this.tResult.evaluate(vm)
        : this.fResult.evaluate(vm);
  }
}

export class IfStatement extends Expression {
  public constructor(
      public condition: Expression,
      public body: Expression[]) {
    super(ExpressionKind.If);
  }

  public override evaluate(vm: Vm): Value {
    const cond = this.condition.evaluate(vm);
    if (cond.data) {
      let result: Value;
      for (let expr of this.body)
        result = expr.evaluate(vm);
      return result!; // Parser won't allow void in this context.
    }
    return null as any; // This will never actually be used. see prev comment.
  }
}

export class SwitchExpression extends Expression {
  public constructor(
      public test: Expression,
      public patterns: [Expression, Expression][]) {
    super(ExpressionKind.Switch);
  }

  public override evaluate(vm: Vm): Value {
    const test = this.test.evaluate(vm);
    for (let pattern of this.patterns) {
      const patternK = pattern[0].evaluate(vm);
      if (test.data === patternK.data)
        return pattern[1].evaluate(vm);
    }
    throw new DashError("no match");
  }
}

export class TypeExpression extends Expression {
  public constructor(token: TypeToken) {
    super(ExpressionKind.Type);
  }

  public override evaluate(vm: Vm): Value {
    return new Value(data.Type.Type, new Type());
  }
}

export class ValueExpression extends Expression {
  type: data.Type;
  value: any;

  public constructor(type: data.Type, value: any) {
    super(ExpressionKind.Value);
    this.type = type;
    this.value = value;
  }

  public override evaluate(vm: Vm): Value {
    return new Value(this.type, this.value);
  }
}

export function mapArgsToParams(args: Expression[], params: ParameterToken[]): Expression[] {
  let mappedArgs: Expression[] = [ ];

  const expectedN = getExpectedArgCount(params);
  if (args.length < expectedN[0] || args.length > expectedN[1]) {
    if (expectedN[0] === expectedN[1])
      throw new DashError(`expected ${expectedN[0]} args, received ${args.length}`);
    else
      throw new DashError(`expected ${expectedN[0]}-${expectedN[1]} args, received ${args.length}`);
  }

  for (let i = 0; i < params.length; i++) {
    if (args.length > i) { // We have an arg!
      const arg = args[i];
      mappedArgs[i] = (arg);
    }
    else if (params[i].defaultValue) {
      mappedArgs[i] = (params[i].defaultValue!);
    }
  }

  return mappedArgs;
}

export function getExpectedArgCount(params: ParameterToken[]): [number, number] {
  let lower = 0,
      upper = 0;
  let isOptional = false;
  // for (let i = 0; )
  for (let param of params) {
    upper += 1;
    if (param.defaultValue) {
      isOptional = true;
    } else if (! isOptional) {
      lower += 1;
    }
  }

  return [lower, upper];
}
