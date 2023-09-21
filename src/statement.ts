import { DashError } from "./error";
import { Expression, IdentifierExpression, ValueExpression } from "./expression";
import { AssignmentTarget, Block, Node, NodeKind } from "./node";
import { FunctionDeclToken, ParameterToken } from "./token";
import { FUNCTION, ValueType } from "./type";
import { FunctionValue, Value } from "./value";
import { Vm } from "./vm";

export enum StatementKind {
  Assignment,
  Declaration,
  DestrAssignment,
  Export,
  For,
  Function,
  If,
  Return,
  While
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
      public typeDef?: Expression) {
    super(target, valueExpr);
    this.type = StatementKind.Declaration;
  }

  public override apply(vm: Vm) {
    const value = this.valueExpr.evaluate(vm);

    if (this.typeDef) {
      const type = this.typeDef.evaluate(vm).data as ValueType;
      if (! type.isAssignable(value.type))
        throw new TypeError(`${value.type.name} not assignable to ${type.name}`);
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
    const val = new FunctionValue(this.params, this.body, vm);
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
    const key = this.identifier.getKey();
    const iterable = this.iterExpr.evaluate(vm);

    if (iterable.type === FUNCTION) {
      const iterFn = iterable as FunctionValue;
      const sub = vm.sub();
      let value: Value;
      while ((value = iterFn.call(vm, [])).data !== 0) {
        sub.assign(key, value);
        this.block.apply(sub);
      }
    } else {
      throw new DashError(iterable.type.name+" not iterable");
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
