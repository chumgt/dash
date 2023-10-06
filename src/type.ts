import { DatumType } from "./data.js";
import { DashError } from "./error.js";
import { BinaryOpKind, UnaryOpKind } from "./expression.js";
import { Vm } from "./index.js";
import { type NativeFunctionContext, Value } from "./vm/value.js";

export type BinaryOperatorFunction =
    (a: Value, b: Value, vm: Vm) => Value;

export type UnaryOperatorFunction =
    (a: Value, vm: Vm) => Value;

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

export interface BuiltinTypeFactory {
  getType(type: DatumType): Type;
}

export interface Domain {
  isAssignable(type: Type): boolean;
  isCastable(type: Type): boolean;
}

export interface JSType<T> {
  wrap(value: T): Value;
}

export class Type {
  public constructor(
      public readonly superType?: ValueType,
      public readonly header?: Readonly<TypeHeader>) {}

  public get name(): string {
    return this.header?.name ?? this.constructor.name;
  }
  /**
   * Ascend the type hierarchy.
   */
  public *ascend(): Iterable<Type> {
    let target: Type = this;
    while (target.superType) {
      target = target.superType;
      yield target;
    }
  }
  /**
   * Determine if this type is a sub-type of `type`.
   * @param type The super-type to test.
   */
  public extends(type: Type): boolean {
    for (let superType of this.ascend()) {
      if (superType === type)
        return true;
    }
    return false;
  }

  public stringify(value: Value): string {
    return this.superType?.stringify(value) ?? value.toString();
  }

  /**
   * @returns The type at the top of this type's hierarchy.
   */
  public getBase(): Type {
    let base: Type = this;
    for (let superType of this.ascend())
      base = superType;
    return base;
  }

  public getDepth(from?: Type): number {
    let depth = 0;
    for (let superType of this.ascend()) {
      depth += 1;

      if (from === superType)
        break;
    }
    return depth;
  }

  public getDistance(type: Type, _distance: number = 0): number {
    if (this.isImplicitCastableTo(type))
      return _distance;

    if (this.extends(type))
      return this.getDepth(type);

    throw new DashError("cannot get distance of unrelated types");
  }

  public isAssignable(type: Type): boolean {
    return (type === this)
        || type.isImplicitCastableTo(this)
        || type.extends(this);
  }

  public isCastableTo(type: Type): boolean {
    if (type === this || this.isImplicitCastableTo(type))
      return true;
    if (this.superType)
      return this.superType.isCastableTo(type);
    return false;
  }

  public isImplicitCastableTo(type: Type): boolean {
    if (type === this || this.extends(type))
      return true;
    return false;
  }

  public isTypeOf(t: Type): boolean {
    if (this === t || this.extends(t))
      return true;
    if (this.superType?.isTypeOf(t))
      return true;
    return false;
  }
}

export class ValueType extends Type {
  public static readonly ITERABLE = Symbol();

  public static biggest<T0 extends ValueType, T1 extends ValueType>(a: T0, b: T1): T0 | T1 {
    if (a.header?.byteLength && b.header?.byteLength) {
      return (a.header.byteLength >= b.header.byteLength) ? a : b;
    }
    throw new DashError("cannot compare sizes of non-primitive types");
  }

  public operators: Partial<BinaryOperatorMap | UnaryOperatorMap>;
  public fields: Record<string, FieldInfo>;

  public constructor(superType?: ValueType,
      override header?: Readonly<ValueTypeHeader>) {
    super(superType, header);
    this.operators = { };
    this.fields = { };
  }

  public cast(value: Value): Value | never {
    if (this.superType)
      return this.superType.cast(value);
    throw new DashError("cannot cast");
  }

  public wrap(value: any): Value {
    if (this.superType)
      return this.superType.wrap(value);
    throw new DashError(`cannot wrap ${typeof value} with ${this.name}`);
  }

  public getOperator(op: BinaryOpKind): BinaryOperatorFunction | undefined;
  public getOperator(op: UnaryOpKind): UnaryOperatorFunction | undefined;
  public getOperator(op: BinaryOpKind | UnaryOpKind): BinaryOperatorFunction | UnaryOperatorFunction | undefined {
    return this.operators[op] ?? this.superType?.getOperator(op as any);
  }

  public isIterable(value: Value): boolean { return false }
  public getIterator(ctx: NativeFunctionContext, value: Value): Value  {
    throw new DashError(this.isIterable(value)
        ? "iterator not defined"
        : this.name + " not iterable");
  }
}

/*
Lua a ~= b to not (a == b), a > b to b < a, and a >= b to b <= a.
 */
