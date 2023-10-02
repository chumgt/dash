import { DashError } from "../error.js";
import { Expression } from "../expression.js";
import { ParameterToken } from "../token.js";
import { ValueType } from "./type.js";
import { Vm } from "./vm.js";
import * as types from "./type.js";

export type NativeFunction =
    (args: Value[]) => Value | never;

export class Value {
  public static readonly ITER_STOP = new Value(types.INT8, "STOP");
  public static readonly VOID = new Value(types.INT, 0);

  public constructor(
      public readonly type: ValueType,
      public readonly data: any,
      public properties?: Record<string, any>) {
    if (data === null || data === undefined)
      throw new DashError("null or undefined!");
  }

  public toString(): string {
    return `[${this.type.name} ${this.data}]`;
  }
}

export abstract class FunctionValue extends Value {
  public constructor(data: any = "<fn>", properties?: any) {
    super(types.FUNCTION, data, properties);
  }

  public abstract apply(vm: Vm, args: Value[]): Value;
  public abstract call(vm: Vm, args: Value[]): Value;

  public callExpr(vm: Vm, args: Expression[]): Value {
    const values = args.map(x => x.evaluate(vm));
    return this.call(vm, values);
  }
}

export interface FunctionSignature {
  params: { };
}

export class DashFunctionValue extends FunctionValue {
  public constructor(
      public params: ParameterToken[],
      public block: Expression,
      public context: Vm) {
    super();
  }

  public apply(vm: Vm, args: Value[]): Value {
    if (args.length !== this.params.length)
      throw new DashError("incorrect arg count");

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const param = this.params[i];

      if (param.typedef) {
        const expectedType = param.typedef?.evaluate(vm);
        if (! expectedType.type.extends(types.TYPE))
          throw new DashError("typedef resolved to non-type");

        const type = expectedType.data;
        if (! type.isAssignable(arg.type))
          throw new DashError(`arg ${i} incompatible types ${arg.type.name} and ${expectedType.data.name}`);
      }

      vm.assign(param.name, arg);
    }

    return this.block.evaluate(vm);
  }

  public override call(vm: Vm, args: Value[]): Value {
    const sub = this.context.sub();
    return this.apply(sub, args);
  }
}

export class NativeFunctionValue extends FunctionValue {
  public constructor(
      public params: ParameterToken[] | undefined,
      public override data: NativeFunction) {
    super(data);
  }

  public override apply(vm: Vm, args: Value[]): Value {
    return this.data(args);
  }

  public override call(vm: Vm, args: Value[]): Value {
    return this.apply(vm, args);
  }
}

//#region funcs
export function newArray(vm: Vm, values: Value[]): Value {
  const self: Value = new Value(types.ARRAY, values ?? [], {
    length: new Value(types.INT32, values.length),
    add: wrapFunction((args) =>
      newArray(vm, [...self.data, ...args])
    ),
    at: wrapFunction((args) => {
      if (! types.INT.isAssignable(args[0].type))
        throw new DashError("array index must be an int");

      const index = args[0].data;
      if (index < 0 || index >= self.data.length)
        throw new DashError(`array index ${index} out of bounds (${self.data.length})`);
      return self.data[index];
    }),
    has: wrapFunction((args) => {
      const index = self.data.findIndex(x => x.data === args[0].data);
      return new Value(types.INT8, index >= 0 ? 1 : 0);
    }),
    toString: wrapFunction((args) =>
      new Value(types.STRING, self.data.join(", "))
    ),
    iter: wrapFunction((args) => {
      let i = 0;
      return wrapFunction(() => {
        if (i >= self.data.length)
          return Value.ITER_STOP;
        const temp = self.data[i];
        i += 1;
        return temp;
      });
    })
  });
  return self;
}

export function newRangeIter(start: number, stop: number, step: number): Value {
  let i = start;

  return wrapFunction(() => {
    if (Math.sign(step) !== Math.sign(stop - i))
      return Value.ITER_STOP;
    const value = i;
    i += step;
    return new Value(types.INT32, value);
  });
}

export function wrapFunction(fn: NativeFunction): Value {
  return new NativeFunctionValue(undefined, fn);
}

export function wrapObject(obj: object): Value | never {
  const props = {};
  for (let key of Object.keys(obj)) {
    props[key] = wrap(obj[key]);
  }
  return new Value(types.OBJECT, props);
}

export function wrap(jsValue: any): Value | never {
  switch (typeof jsValue) {
    case "boolean":
      return new Value(types.INT8, jsValue ? 1 : 0);
    case "function":
      return wrapFunction(((args) => {
        const result = jsValue(...args.map(x => x.data));
        return result ? wrap(result) : Value.VOID;
      }));
    case "number":
      return new Value(types.FLOAT64, jsValue);
    case "object":
      return wrapObject(jsValue);
    case "string":
      return new Value(types.STRING, jsValue);
    default:
      throw new DashError(`${typeof jsValue} cannot be wrapped`);
  }
}

export function getValueIteratorFn(iterable: Value, vm: Vm): FunctionValue | never {
  if (types.FUNCTION.isAssignable(iterable.type)) {
    return iterable as FunctionValue;
  } else if (iterable.properties?.iter) {
    const iterFn = iterable.properties.iter;
    if (! types.FUNCTION.isAssignable(iterFn.type))
      throw new DashError(`${iterable.type.name} not iterable`);
    return getValueIteratorFn(iterFn.call(vm, []), vm);
  } else {
    throw new DashError(`${iterable.type.name} not iterable`);
  }
}
//#endregion
