import { DashError } from "./error.js";
import { Expression, IdentifierExpression, ValueExpression } from "./expression.js";
import { FnParameters } from "./function.js";
import { AssignmentTarget, Block, Node, NodeKind } from "./node.js";
import { ParameterToken } from "./token.js";
import { ValueType } from "./type.js";
import { DashFunctionValue, FunctionValue, Value } from "./vm/value.js";
import { Vm } from "./vm/vm.js";
import * as types from "./vm/types.js";

export enum StatementKind {
  Assignment,
  Declaration,
  DestrAssignment,
  Export,
  For,
  Function,
  If,
  Return,
  Throw,
  While
}

export enum FlowType {
  Return,
  Throw
}

export interface DeclarationInfo {
  annotations: Expression[];
  returnType: Expression;
}

export interface Flow {
  type: FlowType;
  value?: Value;
}

export abstract class Statement extends Node {
  public constructor(public type: StatementKind) {
    super(NodeKind.Statement);
  }
  /**
   * Applies this statement to the specified scope.
   * A return value implies a change in control flow.
   * @param vm
   */
  public abstract apply(vm: Vm): Value | void;
}

export class StatementBlock extends Block {
  public constructor(override body: Statement[]) {
    super(body);
  }

  public apply(vm: Vm) {
    const sub = vm.sub();
    for (let stmt of this.body) {
      const returned = stmt.apply(vm);
      if (returned)
        return returned;
    }
  }
}

export class AssignmentStatement extends Statement {
  public static readonly FLAG_DECLARE = 1 << 0;

  public constructor(
      public target: AssignmentTarget,
      public valueExpr: Expression,
      public flags: number = 0) {
    super(StatementKind.Assignment);
  }

  public override apply(vm: Vm): void {
    const value = this.valueExpr.evaluate(vm);
    this.target.assign(value, vm);
  }
}

export class DeclarationStatement extends AssignmentStatement {
  public constructor(target: AssignmentTarget, valueExpr: Expression,
      public info: DeclarationInfo) {
    super(target, valueExpr);
    this.type = StatementKind.Declaration;
  }

  public override apply(vm: Vm) {
    let value = this.valueExpr.evaluate(vm);

    if (this.info.returnType) {
      const type = this.info.returnType.evaluate(vm).data as ValueType;
      if (! type.isAssignable(value.type))
        throw new TypeError(`${value.type.name} not assignable to ${type.name}`);
    }

    if (this.info.annotations?.length > 0) {
      for (let anno of this.info.annotations) {
        const func = anno.evaluate(vm);
        if (! types.FUNCTION.isAssignable(func.type))
          throw new DashError("annotation must be a fn");
        value = (func as FunctionValue).call(vm, [value]);
      }
    }

    const key = this.target.getKey();
    vm.declare(key, {type: types.ANY});
    vm.assign(key, value);
  }
}

export class FunctionDeclaration extends Statement {
  public readonly target: AssignmentTarget;

  public constructor(
      protected identifier: IdentifierExpression,
      protected params: ParameterToken[],
      protected body: Expression,
      public info: DeclarationInfo) {
    super(StatementKind.Function);
    this.target = identifier;
  }

  public override apply(vm: Vm): void {
    const val = new DashFunctionValue(this.getParameters(vm), this.body, vm);
    vm.defineFn(this.identifier.getKey(), val);
  }

  protected getParameters(vm: Vm): FnParameters {
    const params: FnParameters = [];
    for (let param of this.params) {
      if (param.typedef) {
        const res = param.typedef.evaluate(vm);
        if (! types.TYPE.isAssignable(res.type))
          throw new DashError(`${param.name} is not typedef'd to a type`);
        params.push({
          name: param.name,
          type: res.data
        });
      } else {
        params.push({
          name: param.name,
          type: types.ANY
        });
      }
    }
    return params;
  }
}

export class DestrAssignmentStatement extends Statement {
  public constructor(
      public lhs: IdentifierExpression[],
      public rhs: Expression[]) {
    super(StatementKind.DestrAssignment);
  }

  public override apply(vm: Vm) {
    if (this.rhs.length < this.lhs.length)
      throw new DashError("too few values to unpack");
    if (this.rhs.length > this.lhs.length)
      throw new DashError("too many values to unpack");

    const values = new Map<AssignmentTarget, Value>();
    for (let i = 0; i < this.lhs.length; i++) {
      values.set(this.lhs[i], this.rhs[i].evaluate(vm));
    }

    for (let [target, value] of values) {
      target.assign(value, vm);
    }
  }
}

export class ExportStatement extends Statement {
  public constructor(public declaration: DeclarationStatement) {
    super(StatementKind.Export);
  }

  public apply(vm: Vm) {
    this.declaration.apply(vm);
    const key = this.declaration.target.getKey();
    vm.addExport(key);
  }
}

export class ForInStatement extends Statement {
  public constructor(
      public identifier: IdentifierExpression,
      public iterExpr: Expression,
      public block: StatementBlock) {
    super(StatementKind.For);
  }

  public override apply(vm: Vm): void {
    const iter = this.iterExpr.evaluate(vm);
    this.iterate(iter, vm);
  }

  protected iterate(iterator: Value, vm: Vm) {
    // if (! types.isIteratorObject(iterator, {vm}))
    //   throw new DashError("not an iterator");

    const isDoneFn = iterator.data.done as FunctionValue;
    const nextFn = iterator.data.next as FunctionValue;
    const key = this.identifier.getKey();
    const sub = vm.sub();
    sub.declare(key, {type: types.ANY});
    let value: Value;
    while (isDoneFn.call(vm, []).data === 0) {
      const value = nextFn.call(vm, []);
      sub.assign(key, value);
      this.block.apply(sub);
    }
  }
}

export class IfStatement extends Statement {
  public constructor(
      public condition: Expression,
      public block: StatementBlock,
      public elseBlock?: StatementBlock) {
    super(StatementKind.If);
  }

  public override apply(vm: Vm) {
    const cond = this.condition.evaluate(vm);
    if (cond.data) {
      return this.block.apply(vm);
    } else if (this.elseBlock) {
      return this.elseBlock.apply(vm);
    }
  }
}

export class ReturnStatement extends Statement {
  public constructor(public expr: Expression) {
    super(StatementKind.Return);
  }

  public override apply(vm: Vm) {
    return this.expr.evaluate(vm);
  }
}

export class ThrowStatement extends Statement {
  public constructor(public expr: Expression) {
    super(StatementKind.Throw);
  }

  public override apply(vm: Vm): void {
    throw new DashError(`Thrown:\t${this.expr.evaluate(vm)}`);
  }
}

export class WhileStatement extends Statement {
  public constructor(
      public condition: ValueExpression,
      public block: StatementBlock) {
    super(StatementKind.While);
  }

  public override apply(vm: Vm): void {
    while (this.condition.evaluate(vm).data !== 0)
      this.block.apply(vm);
  }
}
