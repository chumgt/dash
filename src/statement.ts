import { DashError } from "./error.js";
import { Expression, IdentifierExpression } from "./expression.js";
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
  annotations?: Expression[];
  type?: Expression;
  constant?: boolean;
}

export interface FnDeclarationInfo {
  annotations?: Expression[];
  returnType: Expression;
}

export interface Flow {
  type: FlowType;
  value?: Value;
}

export interface Statement extends Node {
  /**
   * Applies this statement to the specified scope.
   * A return value implies a change in control flow.
   * @param vm
   */
  apply(vm: Vm): Value | void;
}

export interface Declaration extends Statement {
  getKey(): string;
  getValue(vm: Vm): Value;
}

export interface Assignment extends Statement {
  getKey(): string;
  getValue(vm: Vm): Value;
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

export class AssignmentStatement extends Node
implements Assignment, Statement {
  public constructor(
      public target: AssignmentTarget,
      public valueExpr: Expression,
      public flags: number = 0) {
    super(NodeKind.Assignment);
  }

  public apply(vm: Vm): void {
    vm.assign(this.getKey(), this.getValue(vm));
  }

  public getKey(): string {
    return this.target.getKey();
  }

  public getValue(vm: Vm): Value {
    return this.valueExpr.evaluate(vm);
  }
}

export class DeclarationStatement extends Node
implements Declaration, Statement {
  public constructor(
      public target: AssignmentTarget,
      public valueExpr: Expression,
      public info: DeclarationInfo) {
    super(NodeKind.Declaration);
  }

  public apply(vm: Vm) {
    let value = this.getValue(vm);
    let type = types.ANY;

    if (this.info.type) {
      type = this.info.type.evaluate(vm).data as ValueType;
      if (! type.isAssignable(value.type))
        throw new TypeError(`${value.type.name} not assignable to ${type.name}`);
    }

    const key = this.target.getKey();
    vm.declare(key, {type});
    vm.assign(key, value);
  }

  public getKey(): string {
    return this.target.getKey();
  }

  public getValue(vm: Vm): Value {
    let value = this.valueExpr.evaluate(vm);

    if (this.info.annotations) {
      for (let anno of this.info.annotations) {
        const func = anno.evaluate(vm);
        if (! types.FUNCTION.isAssignable(func.type))
          throw new DashError("annotation must be a fn");
        value = (func as FunctionValue).call(vm, [value]);
      }
    }

    return value;
  }
}

export class FunctionDeclaration extends Node
implements Declaration, Statement {
  public constructor(
      public identifier: IdentifierExpression,
      public params: ParameterToken[],
      public body: Expression,
      public info: FnDeclarationInfo) {
    super(NodeKind.Declaration);
  }

  public apply(vm: Vm): void {
    vm.defineFn(this.getKey(), this.getValue(vm));
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
          required: param.defaultValue === undefined,
          type: res.data
        });
      } else {
        params.push({
          name: param.name,
          required: param.defaultValue === undefined,
          type: types.ANY
        });
      }
    }

    return params;
  }

  public getKey(): string {
    return this.identifier.getKey();
  }

  public getValue(vm: Vm): FunctionValue {
    let value: FunctionValue = new DashFunctionValue(
        this.getParameters(vm), this.body, vm);

    if (this.info.annotations) {
      for (let anno of this.info.annotations) {
        const func = anno.evaluate(vm);
        if (! types.FUNCTION.isAssignable(func.type))
          throw new DashError("annotation must be a fn");
        value = <any> (func as FunctionValue).call(vm, [value]);
      }
    }

    return value;
  }
}

export class ExportStatement extends Node
implements Statement {
  public constructor(public declaration: Declaration) {
    super(NodeKind.Export);
  }

  public apply(vm: Vm) {
    this.declaration.apply(vm);
    const key = this.declaration.getKey();
    vm.addExport(key);
  }
}

export class ForInStatement extends Node
implements Statement {
  public constructor(
      public identifier: IdentifierExpression,
      public iterExpr: Expression,
      public block: StatementBlock) {
    super(NodeKind.ForIn);
  }

  public apply(vm: Vm): void {
    const iterMaybe = this.iterExpr.evaluate(vm);
    const iter = iterMaybe.type.getIterator({vm}, iterMaybe);
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
    while (isDoneFn.call(vm, []).data === 0) {
      const value = nextFn.call(vm, []);
      sub.assign(key, value);
      this.block.apply(sub);
    }
  }
}

export class IfStatement extends Node
implements Statement {
  public constructor(
      public condition: Expression,
      public block: StatementBlock,
      public elseBlock?: StatementBlock) {
    super(NodeKind.If);
  }

  public apply(vm: Vm) {
    const cond = this.condition.evaluate(vm);
    if (cond.data) {
      return this.block.apply(vm);
    } else if (this.elseBlock) {
      return this.elseBlock.apply(vm);
    }
  }
}

export class ReturnStatement extends Node
implements Statement {
  public constructor(public expr: Expression) {
    super(NodeKind.Return);
  }

  public apply(vm: Vm) {
    return this.expr.evaluate(vm);
  }
}

export class ThrowStatement extends Node
implements Statement {
  public constructor(public expr: Expression) {
    super(NodeKind.Throw);
  }

  public apply(vm: Vm): void {
    throw new DashError(`Thrown:\t${this.expr.evaluate(vm)}`);
  }
}

export class WhileStatement extends Node
implements Statement {
  public constructor(
      public condition: Expression,
      public block: StatementBlock) {
    super(NodeKind.While);
  }

  public apply(vm: Vm): void {
    while (this.condition.evaluate(vm).data !== 0)
      this.block.apply(vm);
  }
}
