import { DashError } from "./error";
import { Expression, IdentifierExpression } from "./expression";
import { AssignmentTarget, Node, NodeKind, ProcedureBlock } from "./node";
import { Type } from "./type";
import { Value } from "./value";
import { Vm } from "./vm";

export enum StatementKind {
  Assignment,
  Declaration,
  DestrAssignment,
  Export,
  If
}

export abstract class Statement extends Node {
  public constructor(public type: StatementKind) {
    super(NodeKind.Statement);
  }
  // /** @deprecated */
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
    const key = this.target.getKey();
    if ((this.flags & AssignmentStatement.FLAG_DECLARE) && vm.has(key))
      throw new DashError(`var ${key} already defined`);
    const value = this.valueExpr.evaluate(vm);
    this.target.assign(value, vm);
  }
}

export class DeclarationStatement extends AssignmentStatement {
  public constructor(target: AssignmentTarget, valueExpr: Expression,
      public typeDef?: Expression) {
    super(target, valueExpr);
    this.type = StatementKind.Declaration;
  }

  public override apply(vm: Vm) {
    const value = this.valueExpr.evaluate(vm);

    if (this.typeDef) {
      const type = this.typeDef.evaluate(vm).data as Type;
      if (! type.isAssignable(value.type))
        throw new TypeError(`${value.type.name} not assignable to ${type.name}`);
    }
    this.target.assign(value, vm);
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

    const values: Map<AssignmentTarget, Value> = new Map();
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
    // vm.export();
  }
}

export class IfStatement extends Statement {
  public constructor(
      public condition: Expression,
      public block: ProcedureBlock,
      public elseBlock?: ProcedureBlock) {
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
