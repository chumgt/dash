import * as datum from "./data";
import { DashError } from "./error";
import { Expression } from "./expression";
import { FunctionBlock } from "./node";
import { ParameterToken } from "./token";
import { Type } from "./type";
import { Vm } from "./vm";
import * as types from "./type";

export enum ValueType {
  Datum,
  Function,
  Type
}

export class Value {
  public constructor(
      public readonly type: Type,
      public readonly data: any,
      public readonly properties?: Record<string, Value>) {
    if (data === null || data === undefined)
      throw new DashError("null or undefined!");
  }

  public toString(): string {
    return `[${this.type.name} ${this.data}]`;
  }
}

export class FunctionValue extends Value {
  public constructor(
      public params: ParameterToken[],
      public block: FunctionBlock,
      public context: Vm) {
    super(types.FUNCTION, 0);
  }

  public call(vm: Vm, args: Expression[]): Value {
    if (! Array.isArray(args))
      throw new DashError(`expected args array, received ${typeof args}`);
    if (args.length !== this.params.length)
      throw new DashError("incorrect arg count");

    // const sub = vm.save();
    const sub = this.context;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i].evaluate(vm);
      const param = this.params[i];

      if (param.typedef) {
        const expectedType = param.typedef?.evaluate(sub);
        if (! expectedType.type.extends(types.TYPE))
          throw new DashError("typedef resolved to non-type");
        if (! expectedType.type.isAssignable(arg.type))
          throw new DashError(`arg ${i} incompatible types`);
      }

      sub.assign(param.name, arg);
    }

    return this.block.execute(sub);
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
