import { DatumType } from "../data.js";
import { DashError } from "../error.js";
import { ValueType } from "../type.js";
import { TYPE } from "./types.js";
import { Value } from "./value.js";

export class Environ {
  protected types: Record<DatumType, ValueType>;
  private typeValues: Record<DatumType, Value>;

  public constructor() {
    this.types = {} as any;
    this.typeValues = {} as any;
  }

  public defineBaseType(datumType: DatumType, type: ValueType) {
    if (datumType in this.types)
      throw new DashError(`base type ${datumType} already defined`);

    this.types[datumType] = type;
    this.typeValues[datumType] = new Value(TYPE, type);
  }

  public getBaseType(datumType: DatumType): ValueType {
    if (datumType in this.types)
      return this.types[datumType];

    throw new DashError(`base type ${datumType} not defined`);
  }

  public getBaseTypeAsValue(datumType: DatumType): Value {
    if (datumType in this.typeValues)
      return this.typeValues[datumType];

    throw new DashError(`base type ${datumType} not defined`);
  }
}
