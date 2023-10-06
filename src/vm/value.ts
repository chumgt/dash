import { DashError } from "../error.js";
import { Expression } from "../expression.js";
import { FnParameters } from "../function.js";
import { ValueType } from "../type.js";
import { Vm } from "./vm.js";
import { DatumType } from "../data.js";
import * as types from "./types.js";

export interface NativeFunctionContext {
  vm: Vm;
}

export type NativeFunction =
    (args: Value[], ctx: NativeFunctionContext) => Value | never;

export class Value {
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
  public constructor(
      public params?: FnParameters,
      data: any = "<fn>",
      properties?: any) {
    super(types.FUNCTION, data, properties);
  }

  public abstract apply(vm: Vm, args: Value[]): Value;
  public abstract call(vm: Vm, args: Value[]): Value;

  public callExpr(vm: Vm, args: Expression[]): Value {
    const values = args.map(x => x.evaluate(vm));
    return this.call(vm, values);
  }

  public mapArgsToParams(vm: Vm, args: Value[]): Record<string, Value> {
    if (! this.params) {
      return {};
    }

    if (args.length !== this.params.length)
      throw new DashError("incorrect arg count");

    const values: Record<string, Value> = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const param = this.params[i];

      if (! param.type.isAssignable(arg.type))
        throw new DashError(`arg ${i} expected ${param.type} got ${arg.type.name}`);

      values[param.name] = arg;
    }

    return values;
  }
}

export class DashFunctionValue extends FunctionValue {
  public constructor(params: FnParameters,
      public block: Expression,
      public context: Vm) {
    super(params);
  }

  public apply(vm: Vm, args: Value[]): Value {
    const t_any = vm.platform.getBaseType(DatumType.Any);
    const argMap = this.mapArgsToParams(vm, args);

    for (const [key, value] of Object.entries(argMap)) {
      vm.declare(key, {type: t_any});
      vm.assign(key, value);
    }

    return this.block.evaluate(vm);
  }

  public override call(vm: Vm, args: Value[]): Value {
    const sub = this.context.sub();
    return this.apply(sub, args);
  }
}

export class NativeFunctionValue extends FunctionValue {
  public constructor(public override data: NativeFunction,
      params?: FnParameters) {
    super(params, data);
  }

  public override apply(vm: Vm, args: Value[]): Value {
    return this.data(args, {vm});
  }

  public override call(vm: Vm, args: Value[]): Value {
    return this.apply(vm, args);
  }
}

// export class DashIteratorValue extends Value {
//   public constructor() {
//     super(types.OBJECT, )
//   }
// }

//#region funcs
export function newArray(vm: Vm, values: Value[]): Value {
  const {
    [DatumType.Array]: t_Array,
    [DatumType.Boolean]: t_Boolean,
    [DatumType.Int32]: t_Int32,
    [DatumType.String]: t_String
  } = vm.platform.getBaseTypes();

  const self: Value = new Value(t_Array, values ?? [], {
    length: new Value(t_Int32, values.length),
    add: wrapFunction((args) =>
      newArray(vm, [...self.data, ...args])
    ),
    at: wrapFunction((args) => {
      if (! t_Int32.isAssignable(args[0].type))
        throw new DashError("array index must be an int");

      const index = args[0].data;
      if (index < 0 || index >= self.data.length)
        throw new DashError(`array index ${index} out of bounds (${self.data.length})`);
      return self.data[index];
    }),
    has: wrapFunction((args) => {
      const index = self.data.findIndex(x => x.data === args[0].data);
      return new Value(t_Int32, index >= 0 ? 1 : 0);
    }),
    toString: wrapFunction((args) =>
      new Value(t_String, self.data.join(", "))
    ),
    iter: wrapFunction((args) => {
      return newArrayIterator(self);
    })
  });
  return self;
}

export function newArrayIterator(value) {
  let i = 0;

  const done = wrapFunction(() => wrap(i < value.data.length ? 0:1));
  const next = wrapFunction(() => {
    if (i < value.data.length) {
      const t = value.data[i];
      i += 1;
      return t;
    }
    throw new DashError("already done");
  });

  return new Value(types.OBJECT, {done, next});
}

export function newRangeIter(start: number, stop: number, step: number): Value {
  let i = start;

  const self = new Value(types.OBJECT, {
    done: wrapFunction((_args, ctx) =>
        wrap(Math.sign(step) !== Math.sign(stop - i))),
    next: wrapFunction((_args, ctx) => {
      const doneFn = self.data.done as FunctionValue;
      if (doneFn.call(ctx.vm, []).data === 1)
        throw new DashError("iterator is already finished");
      const temp = new Value(types.INT32, i);
      i += step;
      return new Value(types.INT32, temp);
    })
  });
  return self;
}

export function wrapFunction(fn: NativeFunction): Value {
  return new NativeFunctionValue(fn);
}

export function wrapObject(obj: object): Value | never {
  const props = {};
  for (let key of Object.keys(obj)) {
    props[key] = wrap(obj[key]);
  }
  return new Value(types.OBJECT, props);
}

export function wrap(jsValue: any, type?: ValueType): Value | never {
  if (type) {
    return type.wrap(jsValue);
  }

  switch (typeof jsValue) {
    case "boolean":
      return new Value(types.INT8, jsValue ? 1 : 0);
    case "function":
      return wrapFunction((args) => {
        const result = jsValue(...args.map(x => x.data));
        if (result)
          return wrap(result);
        throw new DashError("function returned nothing");
      });
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

/*
export function getIterator(iterable: Value, vm: Vm): Value | never {
  const [ARRAY, FUNCTION, OBJECT] = [
    vm.env.getBaseType(DatumType.Array),
    vm.env.getBaseType(DatumType.Function),
    vm.env.getBaseType(DatumType.Object)
  ];

  if (ARRAY.isAssignable(iterable.type)) {
    const factory = iterable.properties!.iter as FunctionValue;
    return factory.call(vm, []);
  }
  if (FUNCTION.isAssignable(iterable.type)) {
    return new Value(OBJECT, {
      done: wrapFunction(() => new Value(types.INT8, 0)),
      next: iterable
    });
  }
  if (OBJECT.isAssignable(iterable.type)) {
    if (iterable.properties?.iter) {
      const iterFn = iterable.properties.iter as FunctionValue;
      if (! FUNCTION.isAssignable(iterFn.type))
        throw new DashError(`${iterable.type.name} not iterable`);
      return getIterator(iterFn.call(vm, []), vm);
    }
  }

  throw new DashError(`${iterable.type.name} not iterable`);
}*/
//#endregion
