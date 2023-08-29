import { DashError } from "./error";
import { ParameterToken } from "./token";
import * as data from "./data";

export class Value {
  public static readonly NEVER = new Value(15 /*Any*/, Symbol());

  public params: ParameterToken[];
  public properties: Record<string, Value>;

  public constructor(
      public readonly type: data.Type,
      public readonly data: any,
      public readonly name?: string) {
    if (data === null || data === undefined)
      throw new DashError("Value cannot wrap null or undefined");
    this.properties = { };
  }

  public native?(...args: Value[]);

  public toString(): string {
    return `[${this.type} ${this.data}]`;
  }
}
