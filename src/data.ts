
export enum DatumType {
  Int8 = 1 << 0,
  Int16 = 1 << 1,
  Int32 = 1 << 2,
  Int64 = 1 << 3,
  Float32 = 1 << 4,
  Float64 = 1 << 5,

  Function = 1 << 7,
  String = 1 << 8,
  Type = 1 << 9,

  Float = Float32 | Float64,
  Integer = Int8 | Int16 | Int32 | Int64,
  Number = Float | Integer,
  Any = Function | Number | String | Type
}

export interface DatumTypeCastMap {
  [DatumType.Float32]: [DatumType.Float64, DatumType.Int8, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Float64]: [DatumType.Float32, DatumType.Int8, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Int8]: [DatumType.Float32, DatumType.Float64, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Int16]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int32, DatumType.Int64],
  [DatumType.Int32]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int16, DatumType.Int64],
  [DatumType.Int64]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int32, DatumType.Int32]
}
