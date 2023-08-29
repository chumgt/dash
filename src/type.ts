import { DashError } from "./error";
import { BinaryOpKind } from "./expression";
import { Value } from "./value";

export class Type {
  public operators: Partial<Record<BinaryOpKind, (arg: Value) => Value>>;

  public constructor(public readonly superType?: Type) {
    this.operators = { };
  }

  public cast(value: Value): Value | never {
    throw new DashError("cannot cast");
  }

  public extends(type: Type): boolean {
    if (this === type)
      return true;
    if (this.superType)
      return this.superType.extends(type);
    return false;
  }
}
