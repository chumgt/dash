import { DatumType } from "../data.js";
import { DashError } from "../error.js";
import { BinaryOpKind, UnaryOpKind } from "../expression.js";
import { Value, newRangeIter, wrapFunction } from "./value.js";

export type BinaryOperatorFunction =
    (a: Value, b: Value) => Value;

export type UnaryOperatorFunction =
    (a: Value) => Value;

export type BinaryOperatorMap = {
  [K in keyof typeof BinaryOpKind]: BinaryOperatorFunction;
};

export type UnaryOperatorMap = {
  [K in keyof typeof UnaryOpKind]: UnaryOperatorFunction;
};

export interface FieldInfo {
  name: string;
  type: Type;
}

export interface TypeHeader {
  name: string;
}

export interface ValueTypeHeader extends TypeHeader {
  byteLength?: number;
}

export class Type {
  public constructor(public readonly header?: Readonly<TypeHeader>) {}

  public isAssignable(type: Type): boolean {
    return type === this;
  }
}

export class ValueType extends Type {
  public static biggest<T0 extends ValueType, T1 extends ValueType>(a: T0, b: T1): T0 | T1 {
    if (a.header?.byteLength && b.header?.byteLength) {
      return (a.header.byteLength >= b.header.byteLength) ? a : b;
    }
    throw new DashError("cannot compare sizes of non-primitive types");
  }

  public operators: Partial<BinaryOperatorMap | UnaryOperatorMap>;
  public fields: Record<string, FieldInfo>;

  public constructor(
      public readonly superType?: ValueType,
      override readonly header?: Readonly<ValueTypeHeader>) {
    super();
    this.operators = { };
    this.fields = { };
  }

  public get name(): string {
    return this.header?.name ?? this.constructor.name;
  }

  public cast(value: Value): Value | never {
    throw new DashError("cannot cast");
  }

  public extends(type: ValueType): boolean {
    return (this === type)
        || this.superType?.extends(type)
        || false;
  }

  public from(type: DatumType, value: any): Value {
    throw new DashError(`cannot convert ${type} to ${this.name}`);
  }

  public getOperator(op: BinaryOpKind): BinaryOperatorFunction | undefined;
  public getOperator(op: UnaryOpKind): UnaryOperatorFunction | undefined;
  public getOperator(op: BinaryOpKind | UnaryOpKind): BinaryOperatorFunction | UnaryOperatorFunction | undefined {
    return this.operators[op] ?? this.superType?.getOperator(op as any);
  }

  public override isAssignable(type: Type): boolean {
    if (super.isAssignable(type))
      return true;
    if (type instanceof ValueType)
      return type.extends(this);
    return false;
  }
}

/*
Lua a ~= b to not (a == b), a > b to b < a, and a >= b to b <= a.
 */

export const TYPE = new ValueType();
export const OBJECT = new ValueType();
OBJECT.operators[BinaryOpKind.Dereference] = (a, b) => {
  return a.properties?.[b.data] ?? a.data[b.data];
};

export const ARRAY = new ValueType(undefined, {name: "Array"});
ARRAY.operators[BinaryOpKind.Dereference] = (a, b) => {
  const key = b.data;
  if (a.properties && key in a.properties)
    return a.properties[b.data];
  else
    throw new DashError("not found");
}

export const ANY = new Type();
ANY.isAssignable = function (type) { return true };

export const NUMBER = new ValueType();
NUMBER.operators[BinaryOpKind.Add] = (a, b) => new Value(ValueType.biggest(a.type, b.type), a.data + b.data);
NUMBER.operators[BinaryOpKind.Divide] = (a, b) => new Value(ValueType.biggest(a.type, b.type), a.data / b.data);
NUMBER.operators[BinaryOpKind.Exponential] = (a, b) => new Value(ValueType.biggest(a.type, b.type), a.data ** b.data);
NUMBER.operators[BinaryOpKind.Multiply] = (a, b) => new Value(ValueType.biggest(a.type, b.type), a.data * b.data);
NUMBER.operators[BinaryOpKind.Subtract] = (a, b) => new Value(ValueType.biggest(a.type, b.type), a.data - b.data);
NUMBER.operators[BinaryOpKind.GT] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data > b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LT] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data < b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.GEQ] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data >= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LEQ] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data <= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.EQ] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data === b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.NEQ] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data !== b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.And] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data && b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.Or] = (a, b) => new Value(ValueType.biggest(a.type, b.type), (a.data || b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.Concat] = (a, b) => new Value(STRING, String(a.data) + String(b.data));
NUMBER.operators[UnaryOpKind.Negate] = (a) => new Value(a.type, -a.data);
NUMBER.operators[UnaryOpKind.Not] = (a) => new Value(INT8, a.data ? 0 : 1);
NUMBER.cast = function (this: ValueType, _value) {
  throw new DashError("ambiguous number type");
};
NUMBER.operators[BinaryOpKind.Concat] = (a, b) => {
  if (NUMBER.isAssignable(b.type)) {
    const [start, stop] = [a.data, b.data] as number[];
    if (! (Number.isInteger(start) && Number.isInteger(stop)))
      throw new DashError("range only possible with integers");

    return newRangeIter(start, stop, Math.sign(stop - start));
  }
  else if (STRING.isAssignable(b.type)) {
    return new Value(STRING, String(a.data) + b.data);
  }
  else {
    throw new DashError(`concat op on ${a.type.name} and ${b.type.name}`);
  }
};


export const INT = new ValueType(NUMBER);
INT.from = function (this: ValueType, type, value) {
  switch (type) {
    case DatumType.String:
      return new Value(INT32, Number.parseInt(value));
    default:
      throw new DashError("illegal cast");
  }
};
export const FLOAT = new ValueType(NUMBER);
export const FUNCTION = new ValueType(undefined, {name: "function"});

export const INT8 = new ValueType(INT, {name: "int8", byteLength: 1});
export const INT16 = new ValueType(INT, {name: "int16", byteLength: 2});
export const INT32 = new ValueType(INT, {name: "int32", byteLength: 4});
export const INT64 = new ValueType(INT, {name: "int64", byteLength: 8});

export const FLOAT32 = new ValueType(FLOAT, {name: "float32", byteLength: 4});
export const FLOAT64 = new ValueType(FLOAT, {name: "float64", byteLength: 8});

export const STRING = new ValueType(undefined, {name: "string"});
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
