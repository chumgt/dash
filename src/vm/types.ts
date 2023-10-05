import { DashError } from "..";
import { DatumType } from "../data";
import { BinaryOpKind, UnaryOpKind } from "../expression";
import { ValueType } from "../type";
import { FunctionValue, NativeFunctionContext, Value, newArray, newArrayIterator, newRangeIter, wrap, wrapFunction } from "./value";

export type Builtins = Readonly<{
  types: Record<DatumType, any>;
  values: Record<string, Value>;
}>

export const TYPE = new ValueType();
export const ERROR = new ValueType();
export const JSTYPE = new ValueType(TYPE, {name: "<jstype>"});

export const OBJECT = new ValueType(undefined, {name: "obj"});
OBJECT.operators[BinaryOpKind.Dereference] = (a, b) => {
  return a.properties?.[b.data] ?? a.data[b.data];
};
OBJECT.isIterable = (value) => {
  return FUNCTION.isAssignable(value.data.done)
      && FUNCTION.isAssignable(value.data.next)
};
OBJECT.getIterator = (ctx, value) => {
  if (! OBJECT.isIterable(value))
    throw new DashError("object does not have an iterator");
  return (value.data.iter as FunctionValue)
      .call(ctx.vm, []);
};

export const ARRAY = new ValueType(undefined, {name: "Array"});
ARRAY.operators[BinaryOpKind.Dereference] = (a, b) => {
  const key = b.data;
  if (a.properties && key in a.properties)
    return a.properties[b.data];
  else
    throw new DashError("not found");
}
ARRAY.isIterable = (value) => true;
ARRAY.getIterator = (ctx, value) => newArrayIterator(value);

// export const ITERATOR = new ValueType(OBJECT, {name: "iterator"});


export const ANY = new ValueType(undefined, {name: "any"});
ANY.isAssignable = (type) => true;
ANY.isImplicitCastableTo = (type) => true;
ANY.isCastableTo = (type) => true;

export const DATUM = new ValueType();
export const NUMBER = new ValueType(DATUM, {name: "number"});
NUMBER.operators[BinaryOpKind.Add] = (a, b) => new Value(a.type, a.data + b.data);
NUMBER.operators[BinaryOpKind.Divide] = (a, b) => new Value(a.type, a.data / b.data);
NUMBER.operators[BinaryOpKind.Exponential] = (a, b) => new Value(a.type, a.data ** b.data);
NUMBER.operators[BinaryOpKind.Multiply] = (a, b) => new Value(a.type, a.data * b.data);
NUMBER.operators[BinaryOpKind.Subtract] = (a, b) => new Value(a.type, a.data - b.data);
NUMBER.operators[BinaryOpKind.GT] = (a, b) => new Value(a.type, (a.data > b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LT] = (a, b) => new Value(a.type, (a.data < b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.GEQ] = (a, b) => new Value(a.type, (a.data >= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LEQ] = (a, b) => new Value(a.type, (a.data <= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.EQ] = (a, b) => new Value(a.type, (a.data === b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.NEQ] = (a, b) => new Value(a.type, (a.data !== b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.And] = (a, b) => new Value(a.type, (a.data && b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.Or] = (a, b) => new Value(a.type, (a.data || b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.Concat] = (a, b) => new Value(STRING, String(a.data) + String(b.data));
NUMBER.operators[UnaryOpKind.Negate] = (a) => new Value(a.type, -a.data);
NUMBER.operators[UnaryOpKind.Not] = (a) => new Value(INT8, a.data ? 0 : 1);
NUMBER.cast = function (value) {
  throw new DashError("ambiguous number type");
};
NUMBER.wrap = function (value) {
  if (typeof value !== "number")
    throw new DashError(`expected number, received ${typeof value}`);
  return new Value(FLOAT64, value);
};
NUMBER.isAssignable = function (type) {
  return type.isTypeOf(NUMBER);
};

export const INT = new ValueType(NUMBER);
INT.operators[BinaryOpKind.Concat] = (a, b, vm) => {
  if (b.type.isTypeOf(INT)) {
    const [start, stop] = [a.data, b.data] as number[];
    if (! (Number.isInteger(start) && Number.isInteger(stop)))
      throw new DashError("range only possible with integers");

    const values: Value[] = [ ];
    for (let i = start; (start<stop)?(i<=stop):(i>=stop); i+=Math.sign(stop-start))
      values.push(new Value(INT64, i));
    return newArray(vm, values)
  }
  else if (STRING.isAssignable(b.type)) {
    return new Value(STRING, String(a.data) + b.data);
  }
  else {
    throw new DashError(`concat op on ${a.type.name} and ${b.type.name}`);
  }
};
INT.from = function (this: ValueType, type, value) {
  switch (type) {
    case DatumType.String:
      return new Value(INT32, Number.parseInt(value));
    default:
      throw new DashError("illegal cast");
  }
};
INT.isAssignable = function (this: ValueType, type) {
  return type.isTypeOf(INT);
};
INT.isImplicitCastableTo = function (type) {
  return type.extends(INT);
};

export const FLOAT = new ValueType(NUMBER);
export const FUNCTION = new ValueType(undefined, {name: "func"});
FUNCTION.wrap = function (value) {
  if (typeof value !== "function")
    throw new DashError(`expected function, received ${typeof value}`);
  return wrap(value);
};
FUNCTION.isIterable = (value) => true;
FUNCTION.getIterator = (ctx, value) => {
  return new Value(OBJECT, {
    done: wrapFunction(() => new Value(INT8, 0)),
    next: (value as FunctionValue).call(ctx.vm, [])
  });
};

export const INT8 = new ValueType(INT, {name: "int8", byteLength: 1});
export const INT16 = new ValueType(INT, {name: "int16", byteLength: 2});
export const INT32 = new ValueType(INT, {name: "int32", byteLength: 4});
export const INT64 = new ValueType(INT, {name: "int64", byteLength: 8});

export const FLOAT32 = new ValueType(FLOAT, {name: "float32", byteLength: 4});
export const FLOAT64 = new ValueType(FLOAT, {name: "float64", byteLength: 8});

export const STRING = new ValueType(DATUM, {name: "string"});
STRING.operators[BinaryOpKind.Concat] = (a, b) => new Value(STRING, String(a.data) + String(b.data));
STRING.operators[BinaryOpKind.EQ] = (a, b) => new Value(INT8, a.data === b.data ? 1 : 0);
STRING.operators[BinaryOpKind.NEQ] = (a, b) => new Value(INT8, a.data !== b.data ? 1 : 0);
STRING.operators[BinaryOpKind.Dereference] = (a, b) => {
  if (b.type.extends(NUMBER))
    return new Value(STRING, a.data[b.data]);
  switch (b.data) {
    case "length":
      return new Value(INT32, a.data.length);
    case "lower":
      return wrapFunction((args) => {
        return new Value(STRING, a.data.toLowerCase());
      });
    default:
      throw new DashError(`property ${b.data} does not exist on string`);
  }
};
STRING.isIterable = (value) => true;
STRING.getIterator = (ctx, value) => {
  let i = 0;
  return new Value(OBJECT, {
    done: wrapFunction(() => new Value(INT32, i < value.data.length ? 0 : 1)),
    next: wrapFunction(() => {
      return new Value(STRING, value.data[i++]);
    })
  });
};

export function isIteratorObject(val: Value, ctx: NativeFunctionContext): boolean {
  if (! OBJECT.isAssignable(val.type))
    return false;
  if (! (val.data.done && FUNCTION.isAssignable(val.data.done)))
    return false;
  if (! (val.data.next && FUNCTION.isAssignable(val.data.next)))
    return false;
  return true;
}
