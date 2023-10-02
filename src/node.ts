import { Expression } from "./expression.js";
import { Statement } from "./statement.js";
import { Value } from "./vm/value.js";
import { Vm } from "./vm/vm.js";

export enum NodeKind {
  Block,
  Expression,
  Statement,
  StatementList,
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

export interface Exportable {
  getExportName(): string;
  getExportValue(): Value;
}

export interface Resolvable<T> {
  resolve(vm: Vm): T;
}

export interface Symbolic {
  getSymbol(): string;
}

export type ChunkNode =
    Expression | Block;

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
  public constructor(public body: Statement[]) {
    super(NodeKind.Block);
  }

  public override accept(visitor: Visitor<Node>): void {
    super.accept(visitor);
    for (let node of this)
      node.accept(visitor);
  }

  public apply(vm: Vm): void {
    for (let stmt of this)
      stmt.apply(vm);
  }

  public [Symbol.iterator]() {
    return this.body.values();
  }
}

// export class Chunk

export class StatementList extends Node {
  public constructor(public body: readonly Statement[]) {
    super(NodeKind.StatementList);
  }

  public apply(vm: Vm) {
    for (let stmt of this.body)
      stmt.apply(vm);
  }

  public [Symbol.iterator]() {
    return this.body.values();
  }
}

// export class StatementBlock extends Block {
//   public constructor(override body: StatementBlockBody) {
//     super(NodeKind.Block, body);
//   }

//   public apply(vm: Vm): void {
//     for (let stmt of this.body)
//       stmt.apply(vm);
//   }
// }

// export class ModuleBlock extends Block {
//   public constructor(override body: ModuleBlockBody = [ ]) {
//     super(NodeKind.Module, body);
//   }

//   public apply(vm: Vm): Value | void {
//     if (this.body.length === 0)
//       throw new DashError("empty chunk");

//     for (let child of this.body)
//       child.apply(vm);
//   }
// }
