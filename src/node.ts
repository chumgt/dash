import { DashError } from "./error";
import { Expression } from "./expression";
import { Value } from "./value";
import { Vm } from "./vm";

export interface AssignmentTarget {
  assign(value: Value, vm: Vm): void;
  getKey(): string;
}

export interface DereferenceTarget {
  dereference(key: Value): Value;
}

export class Node { }

export class ChunkNode extends Node {
  public constructor(public statements: Expression[] = [ ]) {
    super();
  }

  public evaluate(vm: Vm): Value {
    if (this.statements.length === 0)
      throw new DashError("empty chunk");

    let returnValue: Value;
    for (let stmt of this) {
      returnValue = stmt.evaluate(vm);
    }
    return returnValue!;
  }

  public *[Symbol.iterator](): Iterator<Expression> {
    yield* this.statements;
  }
}
