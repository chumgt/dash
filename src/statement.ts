import { DashError } from "./error.js";
import { Expression, IdentifierExpression, ValueExpression } from "./expression.js";
import { AssignmentTarget, Block, Exportable, Node, NodeKind } from "./node.js";
import { FunctionDeclToken, ParameterToken } from "./token.js";
import { FUNCTION, OBJECT, ValueType } from "./vm/type.js";
import { DashFunctionValue, FunctionValue, Value, getValueIteratorFn } from "./vm/value.js";
import { Vm } from "./vm/vm.js";

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

export interface DeclarationInfo {
  annotations: Expression[];
  returnType: Expression;
}

export abstract class Statement extends Node {
  public constructor(public type: StatementKind) {
    super(NodeKind.Statement);
  }
  public abstract apply(vm: Vm): void;
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
        if (! FUNCTION.isAssignable(func.type))
          throw new DashError("annotation must be a fn");
        value = (func as FunctionValue).call(vm, [value]);
      }
    }

    this.target.assign(value, vm);
  }
}

export class FunctionDeclaration extends Statement {
  public readonly target: AssignmentTarget;

  public constructor(
      protected identifier: IdentifierExpression,
      protected params: ParameterToken[],
      protected body: Expression,
      protected returnType?: Expression) {
    super(StatementKind.Function);
    this.target = identifier;
  }

  public override apply(vm: Vm): void {
    const val = new DashFunctionValue(this.params, this.body, vm);
    this.identifier.assign(val, vm);
  }
/*
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
  */
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
      public block: Block) {
    super(StatementKind.For);
  }

  public override apply(vm: Vm): void {
    const iter = getValueIteratorFn(this.iterExpr.evaluate(vm), vm);
    this.iterate(iter, vm);
  }

  protected iterate(iterator: FunctionValue, vm: Vm) {
    const key = this.identifier.getKey();
    const sub = vm.sub();
    let value: Value;
    while ((value = iterator.callExpr(vm, [])) !== Value.ITER_STOP) {
      sub.assign(key, value);
      this.block.apply(sub);
    }
  }
}

export class IfStatement extends Statement {
  public constructor(
      public condition: Expression,
      public block: Block,
      public elseBlock?: Block) {
    super(StatementKind.If);
  }

  public override apply(vm: Vm) {
    const cond = this.condition.evaluate(vm);
    if (cond.data) {
      this.block.apply(vm);
    } else if (this.elseBlock) {
      this.elseBlock.apply(vm);
    }
  }
}

export class ReturnStatement extends Statement {
  public constructor(public expr?: Expression) {
    super(StatementKind.Return);
  }

  public override apply(vm: Vm): void {
    throw new Error("??");
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
      public block: Block) {
    super(StatementKind.While);
  }

  public override apply(vm: Vm): void {
    while (this.condition.evaluate(vm).data !== 0)
      this.block.apply(vm);
  }
}
