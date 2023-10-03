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

export interface Visitor<T extends Node> {
  visit(node: T): void;
}
export class Node {
  public constructor(public kind: NodeKind) { }

  public accept(visitor: Visitor<this>): void {
    visitor.visit(this);
  }
}

export class Block extends Node {
  public constructor(public body: Node[]) {
    super(NodeKind.Block);
  }

  public override accept(visitor: Visitor<Node>): void {
    super.accept(visitor);
    for (let node of this)
      node.accept(visitor);
  }

  public [Symbol.iterator]() {
    return this.body.values();
  }
}
