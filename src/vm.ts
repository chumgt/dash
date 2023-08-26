import { Type, Value } from "./data";
import { DashError } from "./error";
import { Expression } from "./expression";

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

  public get(identifier: string): Value | never {
    if (identifier in this.definitions)
      return this.definitions[identifier];
    throw new DashError(`Undefined '${identifier}'`);
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
