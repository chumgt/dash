import { DashError } from "./error";
import { BinaryOpKind, UnaryOpKind } from "./expression";
import { Value } from "./value";

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

export interface TypeHeader {
  name: string;
  byteLength?: number;
}

export class Type {
  public static biggest<T0 extends Type, T1 extends Type>(a: T0, b: T1): T0 | T1 {
    if (a.header?.byteLength && b.header?.byteLength) {
      return (a.header.byteLength >= b.header.byteLength)
          ? a
          : b;
    }
    throw new DashError("cannot compare sizes of non-primitive types");
  }

  public operators: Partial<BinaryOperatorMap | UnaryOperatorMap>;

  public constructor(
      public readonly superType?: Type,
      public readonly header?: Readonly<TypeHeader>) {
    this.operators = { };
  }

  public get name(): string {
    return this.header?.name ?? this.constructor.name;
  }

  public cast(value: Value): Value | never {
    throw new DashError("cannot cast");
  }

  public extends(type: Type): boolean {
    return (this === type)
        || this.superType?.extends(type)
        || false;
  }

  public getOperator(op: BinaryOpKind): BinaryOperatorFunction | undefined;
  public getOperator(op: UnaryOpKind): UnaryOperatorFunction | undefined;
  public getOperator(op: BinaryOpKind | UnaryOpKind): BinaryOperatorFunction | UnaryOperatorFunction | undefined {
    return this.operators[op] ?? this.superType?.getOperator(op as any);
  }

  public isAssignable(type: Type): boolean {
    return type.extends(this);
  }
}

/*
Lua a ~= b to not (a == b), a > b to b < a, and a >= b to b <= a.
 */

export const TYPE = new Type();
export const OBJECT = new Type();

export const NUMBER = new Type();
NUMBER.operators[BinaryOpKind.Add] = (a, b) => new Value(Type.biggest(a.type, b.type), a.data + b.data);
NUMBER.operators[BinaryOpKind.Divide] = (a, b) => new Value(Type.biggest(a.type, b.type), a.data / b.data);
NUMBER.operators[BinaryOpKind.Exponential] = (a, b) => new Value(Type.biggest(a.type, b.type), a.data ** b.data);
NUMBER.operators[BinaryOpKind.Multiply] = (a, b) => new Value(Type.biggest(a.type, b.type), a.data * b.data);
NUMBER.operators[BinaryOpKind.Subtract] = (a, b) => new Value(Type.biggest(a.type, b.type), a.data - b.data);
NUMBER.operators[BinaryOpKind.GT] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data > b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LT] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data < b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.GEQ] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data >= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.LEQ] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data <= b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.EQ] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data === b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.NEQ] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data !== b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.And] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data && b.data) ? 1 : 0);
NUMBER.operators[BinaryOpKind.Or] = (a, b) => new Value(Type.biggest(a.type, b.type), (a.data || b.data) ? 1 : 0);
NUMBER.operators[UnaryOpKind.Negate] = (a) => new Value(a.type, -a.data);
NUMBER.cast = function (this: Type, _value) {
  throw new DashError("ambiguous number type");
};

export const INT = new Type(NUMBER);
export const FLOAT = new Type(NUMBER);
export const FUNCTION = new Type();

export const INT8 = new Type(INT, {name: "int8", byteLength: 1});
export const INT16 = new Type(INT, {name: "int16", byteLength: 2});
export const INT32 = new Type(INT, {name: "int32", byteLength: 4});
export const INT64 = new Type(INT, {name: "int64", byteLength: 8});

export const FLOAT32 = new Type(FLOAT, {name: "float32", byteLength: 4});
export const FLOAT64 = new Type(FLOAT, {name: "float64", byteLength: 8});

export const STRING = new Type();
STRING.operators[BinaryOpKind.Concat] = (a, b) => new Value(STRING, a.data + b.data);
