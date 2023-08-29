import { DashError } from "./error";
import { Type } from "./type";
import { Value } from "./value";
import * as data from "./data";

export class Vm {
  protected definitions: Record<string, Value>;
  protected stack: Value[];

  public constructor() {
    this.definitions = { };
    this.stack = [ ];
  }

  public assign(identifier: string, value: Value): void {
    this.definitions[identifier] = value;
  }

  public cast(value: Value, type: Type | data.Type): Value {
    if (typeof type !== "number")
      throw new DashError("Canot cast")

    if (value.type === type)
      return value;

    if (value.type === data.Type.Number) {
      if (type === data.Type.String) {
        return new Value(data.Type.String, String.fromCharCode(value.data));
      } else {
        throw new DashError("idk")
      }
    }
    else if (value.type === data.Type.String) {

    }
    // if (! value.type.extends(type))
    //   throw new DashError(`cannot cast ${value.type.name} to ${type}`);
    return new Value(type, value);
  }

  public get(identifier: string): Value | never {
    if (identifier in this.definitions)
      return this.definitions[identifier];
    throw new DashError(`Undefined '${identifier}'`);
  }

  public has(identifier: string): boolean {
    return identifier in this.definitions;
  }

  public save(): Vm {
    const sub = new Vm();
    Object.assign(sub.definitions, this.definitions);
    sub.stack.push(...this.stack);
    return sub;
  }

  // public push(value: Value): this {
  //   this.stack.push(value);
  //   return this;
  // }
}
