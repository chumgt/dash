import { DashError } from "./error";
import { AssignmentTarget, Block, Node, NodeKind, Visitor } from "./node";
import { FunctionExprToken, ParameterToken, TypeToken, ValueToken } from "./token";
import { ValueType } from "./type";
import { FunctionValue, NativeFunctionValue, Value } from "./value";
import { Vm } from "./vm";
import * as types from "./type";

export enum ExpressionKind {
  /* TODO: These are strings for development as it makes it easier to read the
   * AST, but should be numbers in production.
   */
  Block = "Block",
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
  DestrAssignment = "DestrAssignment",
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

export const enum BinaryOpKind {
  Assign,
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

export const enum UnaryOpKind {
  Negate,
  Not
}

export enum ValueKind {
  Number,
  String
}

export abstract class Expression extends Node {
  public constructor(public type: ExpressionKind) {
    super(NodeKind.Expression);
  }
  public abstract evaluate(vm: Vm): Value;
}

export class BlockExpression extends Expression {
  public constructor(
      public block: Block,
      public returnExpr: Expression) {
    super(ExpressionKind.Block);
  }

  public override evaluate(vm: Vm): Value {
    this.block.apply(vm);
    return this.returnExpr.evaluate(vm);
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
    const fn = lhs.type.getOperator(this.op);
    if (! fn)
      throw new DashError(`cannot do op ${this.op} on type ${lhs.type.name}`);

    const rhs = this.rhs.evaluate(vm);
    return fn(lhs, rhs);
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
    const fn = rhs.type.getOperator(this.op);
    if (! fn)
      throw new DashError(`cannot do op ${this.op} on type ${rhs.type.name}`);

    return fn(rhs);
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

  public apply(vm: Vm): void {
    this.evaluate(vm);
  }

  public override evaluate(vm: Vm): Value {
    const target = this.target.evaluate(vm);
    if (target.type !== types.FUNCTION)
      throw new DashError("target is not callable");
    if (target instanceof FunctionValue || target instanceof NativeFunctionValue) {
      const args = (target.params)
          ? mapArgsToParams(this.args, target.params)
          : this.args;
      return target.call(vm, args);
    } else {
      throw new DashError("target is not callable");
    }
  }
}

export class CastExpression extends Expression {
  public constructor(
      public typeDef: Expression,
      public value: Expression) {
    super(ExpressionKind.Cast);
  }

  public override evaluate(vm: Vm): Value {
    const type = this.typeDef.evaluate(vm);
    if (! type.type.extends(types.TYPE))
      throw new DashError("cast to non-type");

    const value = this.value.evaluate(vm);
    throw new DashError("no casting!")
    // return vm.cast(value, type);
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
    const op = lhs.type.operators[BinaryOpKind.Dereference];
    if (! op)
      throw new DashError(`type ${lhs.type.name} is not dereferencable`);
    return op(lhs, new Value(types.STRING, this.rhs.getKey()));
  }

  public assign(value: Value, vm: Vm): void {
    const lhs = this.lhs.evaluate(vm);
    const op = lhs.type.getOperator(BinaryOpKind.Assign);
    if (! op)
      throw new DashError(`type ${lhs.type.name} is not assignable`);
    op(lhs, value);
  }

  public getKey() {
    return this.rhs.getKey();
  }
}

export class FunctionExpression extends Expression {
  block: Expression;
  params: ParameterToken[];

  public constructor(token: FunctionExprToken) {
    super(ExpressionKind.Function);
    this.block = token.block;
    this.params = token.params;
  }

  public override evaluate(vm: Vm): Value {
    const val = new FunctionValue(this.params, this.block, vm);
    return val;
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

export class SwitchExpression extends Expression {
  public constructor(
      public test: Expression | undefined,
      public patterns: [Expression, Expression][],
      public defaultCase: Expression) {
    super(ExpressionKind.Switch);
  }

  public override evaluate(vm: Vm): Value {
    const context = vm.sub();

    if (this.test) {
      const test = this.test.evaluate(vm);
      context.declare("$", {type: test.type}, test);
    }

    for (let caze of this.patterns) {
      const pattern = caze[0];
      if (pattern.type !== ExpressionKind.BinaryOp)
        throw new DashError("case pattern must be an op");

      const patternResult = pattern.evaluate(context);
      if (patternResult.data !== 0) {
        const resultExpr = caze[1];
        return resultExpr.evaluate(context);
      }
    }
    if (this.defaultCase)
      return this.defaultCase.evaluate(context);
    throw new DashError("No match");
  }
}

export class TypeExpression extends Expression {
  public constructor(token: TypeToken) {
    super(ExpressionKind.Type);
  }

  public override evaluate(vm: Vm): Value {
    return new Value(types.TYPE, new ValueType());
  }
}

export class ValueExpression extends Expression {
  public constructor(public token: ValueToken) {
    super(ExpressionKind.Value);
  }

  public override evaluate(vm: Vm): Value {
    return vm.newDatumValue(this.token.type, this.token.value);
  }

  public override accept(visitor: Visitor<this>): void {
    visitor.visit(this);
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
