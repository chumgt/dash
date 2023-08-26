import { DashError } from "./error";
import { State } from "./main";

export type NativeFunction =
    (...args: Value[]) => Value | never;

export enum Type {
  Number = 1 << 0,
  String = 1 << 1,
  Function = 1 << 2,

  Any = Function | Number | String,
  Undefined = 0
}

export interface Param {
  name: string;
  type: Type;
}

export class Value {
  public readonly type: Type;
  public constant?: boolean;
  public writable?: boolean;

  public context?: any;
  public params: Param[];
  public properties: Record<string, Value>;
  private _data: any;

  public constructor(type: Type, data: any) {
    this.type = type;
    this.data = data;
    this.constant = false;
    this.properties = { };
  }

  public get data() { return this._data }
  public set data(value: any) {
    if (value === undefined || value === null)
      throw new DashError("null value");
    this._data = value;
  }

  public cast(type: Type): Value | never {
    if (this.type === type)
      return this;

    switch (this.type) {
      case Type.Number:
        if (type === Type.String)
          return new Value(type, String(this.data));
        break;
      case Type.String:
        if (type === Type.Number)
          return new Value(type, Number(this.data));
        break;
    }

    throw new DashError("cannot cast "+this.type+" to "+type);
  }

  public native?(...args: Value[]);

  public toString(): string {
    return `[${this.type} ${this.data}]`;
  }
}

export function cast(val: Value, type: Type): Value | never {
  if (val.type === type)
    return val;

  switch (val.type) {
    case Type.Number:
      if (type === Type.String)
        return new Value(type, String(val.data));
      break;

    case Type.String:
      if (type === Type.Number)
        return new Value(type, Number(val.data));
      break;
  }

  throw new DashError("cannot cast "+val.type+" to "+type);
}

export function newFunction(context: State, params: Param[], native: NativeFunction): Value {
  const val = new Value(Type.Any, {});
  val.context = context;
  val.native = native;
  val.params = params;
  return val;
}
