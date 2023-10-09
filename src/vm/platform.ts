import { DatumType } from "../data.js";
import { DashError } from "../error.js";
import { ValueType } from "../type.js";
import { Value } from "./value.js";
import * as types from "./types.js";

export class Platform {
  protected types: Record<DatumType, ValueType>;
  private typeValues: Record<DatumType, Value>;

  public constructor() {
    this.types = {} as any;
    this.typeValues = {} as any;
  }

  public newDatumValue(type: DatumType, data: any): Value {
    return new Value(this.getBaseType(type), data);
  }

  public defineBaseType(datumType: DatumType, type: ValueType) {
    if (datumType in this.types)
      throw new DashError(`base type ${datumType} already defined`);
    this.types[datumType] = type;
  }

  public getBaseType(datumType: DatumType): ValueType {
    if (datumType in this.types)
      return this.types[datumType];

    throw new DashError(`base type ${datumType} not defined`);
  }

  public getBaseTypes(...datumTypes: DatumType[]): Record<DatumType, ValueType> {
    return this.types;
  }

  public getBaseTypeAsValue(datumType: DatumType): Value {
    if (datumType in this.typeValues)
      return this.typeValues[datumType];

    const t_Type = this.getBaseType(DatumType.Type);
    const t = this.getBaseType(datumType);
    const val = new Value(t_Type, t);
    this.typeValues[datumType] = val;
    return val;
  }
}

export function newJsPlatform() {
  const platform = new Platform();
  platform.defineBaseType(DatumType.Float, types.FLOAT64)
  platform.defineBaseType(DatumType.Float32, types.FLOAT32)
  platform.defineBaseType(DatumType.Float64, types.FLOAT64)
  platform.defineBaseType(DatumType.Integer, types.INT64)
  platform.defineBaseType(DatumType.Int8, types.INT8)
  platform.defineBaseType(DatumType.Int16, types.INT16)
  platform.defineBaseType(DatumType.Int32, types.INT32)
  platform.defineBaseType(DatumType.Int64, types.INT64)
  platform.defineBaseType(DatumType.Function, types.FUNCTION)
  platform.defineBaseType(DatumType.Number, types.NUMBER)
  platform.defineBaseType(DatumType.String, types.STRING)
  platform.defineBaseType(DatumType.Type, types.TYPE);
  platform.defineBaseType(DatumType.Array, types.ARRAY);
  platform.defineBaseType(DatumType.Object, types.OBJECT);
  platform.defineBaseType(DatumType.Any, types.ANY)
  return platform;
}
