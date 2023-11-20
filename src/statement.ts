import { DashError } from "./error.js";
import { BinaryOpKind, Expression, ReferenceExpression } from "./expression.js";
import { FnParameters } from "./function.js";
import { Assignable, Block, Name, Node, NodeKind } from "./node.js";
import { ParameterToken } from "./token.js";
import { DashFunctionValue, FunctionValue, Value } from "./vm/value.js";
import { Vm } from "./vm/vm.js";
import { DatumType } from "./data.js";

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
  returnType?: Expression;
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
      public target: ReferenceExpression,
      public valueExpr: Expression,
      public flags: number = 0) {
    super(NodeKind.Assignment);
  }

  public apply(vm: Vm): void {
    vm.assign(this.getKey(), this.getValue(vm));
  }

  public getKey(): string {
    return this.target.name.getValue();
  }

  public getValue(vm: Vm): Value {
    return this.valueExpr.evaluate(vm);
  }
}

export class CompoundAssignmentStatement extends Node
implements Assignment, Statement {
  public constructor(
      public target: ReferenceExpression,
      public rhs: Expression,
      public op: BinaryOpKind) {
    super(NodeKind.Assignment);
  }

  public apply(vm: Vm) {
    vm.assign(this.getKey(), this.getValue(vm));
  }

  public getKey(): string {
    return this.target.name.getValue();
  }

  public getValue(vm: Vm): Value {
    const lhs = this.target.evaluate(vm);
    const opFn = lhs.type.getOperator(this.op);
    if (! opFn)
      throw new DashError(`cannot do op ${this.op} on ${lhs.type.name}`);
    const rhs = this.rhs.evaluate(vm);
    return opFn(lhs, rhs, vm);
  }
}

export class DeclarationStatement extends Node
implements Declaration, Statement {
  public constructor(
      public target: Name,
      public valueExpr: Expression,
      public info: DeclarationInfo) {
    super(NodeKind.Declaration);
  }

  public apply(vm: Vm) {
    const {
      [DatumType.Any]: t_Any
    } = vm.platform.getBaseTypes();
    let value = this.getValue(vm);
    let type = t_Any;

    if (this.info.type) {
      const typeV = this.info.type.evaluate(vm);
      if (! type.isAssignable(typeV.type))
        throw new TypeError(`invalid type def ${typeV}`);

      type = typeV.data;
      // if (! type.isAssignable(value.type))
      //   throw new TypeError(`cannot assign ${value.type.name} to ${type.name}`);
    }

    const key = this.target.getValue();
    vm.declare(key, {type:value.type});
    vm.assign(key, value);
  }

  public getKey(): string {
    return this.target.getValue();
  }

  public getValue(vm: Vm): Value {
    const {
      [DatumType.Function]: t_Function
    } = vm.platform.getBaseTypes();
    let value = this.valueExpr.evaluate(vm);

    if (this.info.annotations) {
      for (let anno of this.info.annotations) {
        const func = anno.evaluate(vm);
        if (! t_Function.isAssignable(func.type))
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
      public name: Name,
      public params: ParameterToken[],
      public body: Expression,
      public info: FnDeclarationInfo) {
    super(NodeKind.Declaration);
  }

  public apply(vm: Vm): void {
    vm.defineFn(this.getKey(), this.getValue(vm));
  }

  protected getParameters(vm: Vm): FnParameters {
    const {
      [DatumType.Any]: t_Any,
      [DatumType.Type]: t_Type
    } = vm.platform.getBaseTypes();

    const params: FnParameters = [];
    for (let param of this.params) {
      const paramName = param.name.value;

      if (param.type) {
        const res = param.type.evaluate(vm);
        if (! t_Type.isAssignable(res.type))
          throw new DashError(`${param.name} is not typedef'd to a type`);
        params.push({
          name: param.name.value,
          required: param.defaultValue === undefined,
          type: res.data
        });
      } else {
        params.push({
          name: param.name.value,
          required: param.defaultValue === undefined,
          type: t_Any
        });
      }
    }

    return params;
  }

  public getKey(): string {
    return this.name.getValue();
  }

  public getValue(vm: Vm): FunctionValue {
    const {
      [DatumType.Function]: t_Function
    } = vm.platform.getBaseTypes();
    let value: FunctionValue = new DashFunctionValue(
        this.getParameters(vm), this.body, vm);

    if (this.info.annotations) {
      for (let anno of this.info.annotations) {
        const func = anno.evaluate(vm);
        if (! t_Function.isAssignable(func.type))
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
      public identifier: Name,
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
    const {
      [DatumType.Any]: t_Any
    } = vm.platform.getBaseTypes();

    const isDoneFn = iterator.data.done as FunctionValue;
    const nextFn = iterator.data.next as FunctionValue;
    const key = this.identifier.getValue();
    const sub = vm.sub();
    sub.declare(key, {type: t_Any});
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
    while (this.condition.evaluate(vm).data !== 0) {
      this.block.apply(vm);
    }
  }
}
