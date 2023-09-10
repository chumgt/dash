import { DashError } from "./error";
import { Expression } from "./expression";
import { Statement } from "./statement";
import { Value } from "./value";
import { Vm } from "./vm";

export enum NodeKind {
  Block,
  Module,
  Expression,
  Statement,
  Function,
  Value
}

export interface AssignmentTarget {
  assign(value: Value, vm: Vm): void;
  getKey(): string;
}

export interface DereferenceTarget {
  dereference(key: Value): Value;
}

export interface Resolvable<T> {
  resolve(vm: Vm): T;
}

export class Node {
  public constructor(public kind: NodeKind) { }

  public accept(visitor: Visitor<this>): void {
    visitor.visit(this);
  }
}

export interface Visitor<T extends Node> {
  visit(node: T): void;
}

export class Block extends Node {
  public constructor(public children: Node[]) {
    super(NodeKind.Block);
  }

  public [Symbol.iterator](): IterableIterator<Node> {
    // This function is really only for syntactic sugar in the parser.
    return this.children.values();
  }
}

export class FunctionBlock extends Block {
  public constructor(
      public statements: Statement[],
      public expression: Expression) {
    super([...statements, expression]);
  }

  public execute(vm: Vm): Value {
    if (this.children.length === 0)
      throw new DashError("empty chunk");

    for (let stmt of this.statements)
      stmt.apply(vm);
    return this.expression.evaluate(vm);
  }
}

export class ModuleNode extends Block {
  public constructor(public statements: Statement[] = [ ]) {
    super(statements);
  }

  public apply(vm: Vm): Value | void {
    if (this.statements.length === 0)
      throw new DashError("empty chunk");

    for (let child of this.statements) {
      child.apply(vm);
    }
  }
}

export class ProcedureBlock extends Block {
  public constructor(public statements: Statement[] = [ ]) {
    super(statements);
  }

  public apply(vm: Vm): void {
    if (this.statements.length === 0)
      throw new DashError("empty chunk");

    for (let child of this.statements) {
      child.apply(vm);
    }
  }
}

/*export abstract class ValueNode extends Expression {
  public constructor(
      public readonly datumType: DatumType,
      public readonly datumValue: any) {
    super(ExpressionKind.Value);
  }

  public override evaluate(vm: Vm): Value {
    switch (this.datumType) {
      case DatumType.Int32: vm.newI
    }
  }
}*/

// export class StringNode extends Expression {
//   public constructor(public readonly value: string) {
//     super(NodeKind.Value);
//   }


// }

// export class AsyncChunkNode extends Node {
//   public constructor(public statements: Expression[] = [ ])
// }

// export class FunctionNode extends Node {
//   public constructor(
//       public procedure: any,
//       public expression: Expression) {
//     super(NodeKind.Function);
//   }
// }

// export class ProcedureNode extends Node {
//   public constructor(
//       public statements: ) {}
// }
