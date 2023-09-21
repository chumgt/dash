import { DashError } from "./error";
import { Expression } from "./expression";
import { ParameterToken } from "./token";
import { ValueType } from "./type";
import { Vm } from "./vm";
import * as datum from "./data";
import * as types from "./type";

// export interface ValueHeader {}

// export function e(a: A, b: A): boolean {
// }

export class Value {
  public constructor(
      public readonly type: ValueType,
      public readonly data: any,
      public readonly props?: Record<string, Value>,
      public readonly meta?: Record<string, any>) {
    if (data === null || data === undefined)
      throw new DashError("null or undefined!");
  }

  public toString(): string {
    return `[${this.type.name} ${this.data}]`;
  }
}

export interface FunctionSignature {
  params: { };
}

export class FunctionValue extends Value {
  public constructor(
      public params: ParameterToken[],
      public block: Expression,
      public context: Vm) {
    super(types.FUNCTION, 0);
  }

  public call(vm: Vm, args: Expression[]): Value {
    if (args.length !== this.params.length)
      throw new DashError("incorrect arg count");

    const context = this.context.sub();
    for (let i = 0; i < args.length; i++) {
      const arg = args[i].evaluate(vm);
      const param = this.params[i];

      if (param.typedef) {
        const expectedType = param.typedef?.evaluate(vm);
        if (! expectedType.type.extends(types.TYPE))
          throw new DashError("typedef resolved to non-type");

        const type = expectedType.data;
        if (! type.isAssignable(arg.type))
          throw new DashError(`arg ${i} incompatible types ${arg.type.name} and ${expectedType.data.name}`);
      }

      context.assign(param.name, arg);
    }

    return this.block.evaluate(context);
  }
}

export class NativeFunctionValue extends Value {
  public constructor(
      public params: ParameterToken[] | undefined,
      public override data: datum.NativeFunction) {
    super(types.FUNCTION, data);
  }

  public call(vm: Vm, args: Expression[]): Value {
    const values = args.map(x => x.evaluate(vm));
    return this.data(values);
  }
}

export function wrapFunction(fn: datum.NativeFunction): Value {
  return new NativeFunctionValue(undefined, fn);
}
