import { DatumType } from "./data.js";
import { DashError } from "./error.js";
import { AssignmentTarget, Literal, Node, NodeKind } from "./node.js";
import { FunctionExprToken, LiteralToken, ParameterToken, TypeToken } from "./token.js";
import { ValueType } from "./type.js";
import { FnParameters } from "./function.js";
import { DashFunctionValue, FunctionValue, Value, newArray } from "./vm/value.js";
import { Vm } from "./vm/vm.js";
import { Declaration, StatementBlock } from "./statement.js";

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
  For = "For",
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
  Negate = 16,
  Not
}

export enum ValueKind {
  Number,
  String
}

export interface Expression extends Node {
  readonly type: ExpressionKind;
  evaluate(vm: Vm): Value;
}

export class BlockExpression extends Node
implements Expression {
  public constructor(
      public block: StatementBlock,
      public returnExpr?: Expression) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const returnValue = this.block.apply(vm);
    if (returnValue)
      return returnValue;

    if (this.returnExpr)
      return this.returnExpr.evaluate(vm);

    throw new DashError("block did not return anything");
  }
}

export class BinaryOpExpression extends Node
implements Expression {
  op: BinaryOpKind;
  lhs: Expression;
  rhs: Expression;

  public constructor(op: BinaryOpKind, lhs: Expression, rhs: Expression) {
    super(NodeKind.Expression);
    this.op = op;
    this.lhs = lhs;
    this.rhs = rhs;
  }

  public get type() { return ExpressionKind.BinaryOp }

  public evaluate(vm: Vm): Value {
    const lhs = this.lhs.evaluate(vm);
    const fn = lhs.type.getOperator(this.op);
    if (! fn)
      throw new DashError(`cannot do op ${this.op} on type ${lhs.type.name}`);

    const rhs = this.rhs.evaluate(vm);
    return fn(lhs, rhs, vm);
  }
}

export class UnaryOpExpression extends Node
implements Expression {
  op: UnaryOpKind;
  rhs: Expression;

  public constructor(op: UnaryOpKind, rhs: Expression) {
    super(NodeKind.Expression);
    this.op = op;
    this.rhs = rhs;
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const rhs = this.rhs.evaluate(vm);
    const fn = rhs.type.getOperator(this.op);
    if (! fn)
      throw new DashError(`cannot do op ${this.op} on type ${rhs.type.name}`);

    return fn(rhs, vm);
  }
}

export class CallExpression extends Node
implements Expression {
  target: Expression;
  args: Expression[];

  public constructor(target: Expression, args: Expression[]) {
    super(NodeKind.Expression);
    this.target = target;
    this.args = args;
  }

  public get type() { return ExpressionKind.Block }

  public apply(vm: Vm): void {
    this.evaluate(vm);
  }

  public evaluate(vm: Vm): Value {
    const FUNCTION = vm.platform.getBaseType(DatumType.Function);
    const target = this.target.evaluate(vm);
    if (! FUNCTION.isAssignable(target.type))
      throw new DashError("target is not callable");

    const fn = target as FunctionValue;
    return fn.callExpr(vm, this.args);
  }
}

export class CastExpression extends Node
implements Expression {
  public constructor(
      public expr: Expression,
      public target: Expression) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const {
      [DatumType.Type]: t_type
    } = vm.platform.getBaseTypes();

    const type = this.target.evaluate(vm);
    if (! t_type.isAssignable(type.type))
      throw new DashError("cast to non-type");

    const value = this.expr.evaluate(vm);
    if (! value.type.isCastableTo(type.data))
      throw new DashError(`cannot cast ${value.type.name} to ${type.data.name}`)

    return new Value(type.data, value.data);
  }
}

export class DereferenceExpression extends BinaryOpExpression
implements AssignmentTarget {
  declare rhs: IdentifierExpression;

  public constructor(lhs: Expression, rhs: IdentifierExpression) {
    super(BinaryOpKind.Dereference, lhs, rhs);
  }

  public override get type() { return ExpressionKind.Block }

  public override evaluate(vm: Vm): Value {
    const lhs = this.lhs.evaluate(vm);
    const op = lhs.type.getOperator(BinaryOpKind.Dereference);
    if (! op)
      throw new DashError(`type ${lhs.type.name} is not dereferencable`);

    const t_String = vm.platform.getBaseType(DatumType.String);
    return op(lhs, new Value(t_String, this.rhs.getKey()), vm);
  }

  public assign(value: Value, vm: Vm): void {
    const lhs = this.lhs.evaluate(vm);
    const op = lhs.type.getOperator(BinaryOpKind.Assign);
    if (! op)
      throw new DashError(`type ${lhs.type.name} is not assignable`);
    op(lhs, value, vm);
  }

  public getKey() {
    return this.rhs.getKey();
  }
}

export class FunctionExpression extends Node
implements Expression {
  block: Expression;
  params: ParameterToken[];

  public constructor(token: FunctionExprToken) {
    super(NodeKind.Expression);
    this.block = token.block;
    this.params = token.params;
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const val = new DashFunctionValue(this.getParameters(vm), this.block, vm);
    return val;
  }

  protected getParameters(vm: Vm): FnParameters {
    const {
      [DatumType.Any]: t_any,
      [DatumType.Type]: t_type
    } = vm.platform.getBaseTypes();

    const params: FnParameters = [];
    for (let param of this.params) {
      if (param.typedef) {
        const res = param.typedef.evaluate(vm);
        if (! t_type.isAssignable(res.type))
          throw new DashError(`${param.name} is not typedef'd to a type`);
        params.push({
          name: param.name,
          required: param.defaultValue === undefined,
          type: res.data
        });
      } else {
        params.push({
          name: param.name,
          required: param.defaultValue === undefined,
          type: t_any
        });
      }
    }
    return params;
  }
}

export class IdentifierExpression extends Node
implements Expression, AssignmentTarget {
  value: string;

  public constructor(value: string) {
    super(NodeKind.Expression);
    this.value = value;
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    return vm.get(this.value);
  }

  public assign(value: Value, vm: Vm): void {
    vm.assign(this.getKey(), value);
  }

  public getKey() {
    return this.value;
  }
}

export class IfExpression extends Node implements Expression {
  public constructor(
      public condition: Expression,
      public tResult: Expression,
      public fResult: Expression) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const cond = this.condition.evaluate(vm);
    return (cond.data)
        ? this.tResult.evaluate(vm)
        : this.fResult.evaluate(vm);
  }
}

export class ForMapExpression extends Node
implements Expression {
  public constructor(
      public identifier: IdentifierExpression,
      public iterExpr: Expression,
      public expr: BlockExpression) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.For }

  public evaluate(vm: Vm): Value {
    const value = this.iterExpr.evaluate(vm);
    const iter = value.type.getIterator({vm}, value);
    return this.collect(iter, vm);
  }

  public collect(iterator: Value, vm: Vm) {
    const t_any = vm.platform.getBaseType(DatumType.Any);

    const values: Value[] = [ ];
    const key = this.identifier.getKey();
    const isDoneFn = iterator.data.done as FunctionValue;
    const nextFn = iterator.data.next as FunctionValue;
    const sub = vm.sub();
    sub.declare(key, {type: t_any});
    while (isDoneFn.call(vm, []).data !== 1) {
      const value = nextFn.call(vm, []);
      sub.assign(key, value);
      values.push(this.expr.evaluate(sub));
    }
    return newArray(vm, values);
  }
}

export class SwitchExpression extends Node implements Expression {
  public constructor(
      public test: Expression | undefined,
      public patterns: [Expression, Expression][],
      public defaultCase: Expression) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const context = vm.sub();

    if (this.test) {
      const test = this.test.evaluate(vm);
      context.declare("$", {type: test.type});
      context.assign("$", test);
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

export class TypeExpression extends Node implements Expression {
  public constructor(protected token: TypeToken) {
    super(NodeKind.Expression);
  }

  public get type() { return ExpressionKind.Block }

  public evaluate(vm: Vm): Value {
    const t_type = vm.platform.getBaseType(DatumType.Type);

    const t = new ValueType(t_type);
    for (let [recordK, recordV] of this.token.records) {
      const fieldK = recordK.getKey();
      const fieldT = recordV.evaluate(vm);
      if (! fieldT.type.extends(t_type))
        throw new DashError(`record ${fieldK} not typed`);
      t.fields[fieldK] = ({
        name: fieldK,
        type: fieldT.data
      });
    }

    return new Value(t_type, t);
  }
}

export class LiteralExpression extends Literal
implements Expression {
  public constructor(token: LiteralToken) {
    super(token);
  }

  public get type() { return ExpressionKind.Value }

  public evaluate(vm: Vm): Value {
    return vm.platform.newDatumValue(this.token.type, this.token.value);
  }
}

export class ArrayExpression extends Node
implements Expression {
  public constructor(public content: Expression[]) {
    super(NodeKind.Value);
  }

  public get type() { return ExpressionKind.Value };

  public evaluate(vm: Vm): Value {
    const values: Value[] = [ ];
    for (let expr of this.content) {
      const result = expr.evaluate(vm);
      if (expr.type === ExpressionKind.For) {
        values.push(...result.data);
      } else {
        values.push(result);
      }
    }
    return newArray(vm, values);
  }
}

export class ObjectExpression extends Node
implements Expression {
  public constructor(public properties: Declaration[]) {
    super(NodeKind.Value);
  }

  public get type() { return ExpressionKind.Value };

  public evaluate(vm: Vm): Value {
    const t_object = vm.platform.getBaseType(DatumType.Object);
    const data = { };
    for (let decl of this.properties) {
      const key = decl.getKey();
      data[key] = decl.getValue(vm);
    }
    return new Value(t_object, data);
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
