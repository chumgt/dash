
export enum DatumType {
  Int8 = 1 << 0,
  Int16 = 1 << 1,
  Int32 = 1 << 2,
  Int64 = 1 << 3,
  Float32 = 1 << 4,
  Float64 = 1 << 5,

  Boolean = 1 << 6,
  Function = 1 << 7,
  String = 1 << 8,
  Type = 1 << 9,
  Array = 1 << 10,
  Object = 1 << 11,

  Float = Float32 | Float64,
  Integer = Int8 | Int16 | Int32 | Int64,
  Number = Float | Integer,
  Any = Function | Number | String | Type
}

export interface DatumTypeCastMapping {
  [DatumType.Float32]: [DatumType.Float64, DatumType.Int8, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Float64]: [DatumType.Float32, DatumType.Int8, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Int8]: [DatumType.Float32, DatumType.Float64, DatumType.Int16, DatumType.Int32, DatumType.Int64],
  [DatumType.Int16]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int32, DatumType.Int64],
  [DatumType.Int32]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int16, DatumType.Int64],
  [DatumType.Int64]: [DatumType.Float32, DatumType.Float64, DatumType.Int8, DatumType.Int32, DatumType.Int32]
}

export const typeToNameMap = {
  [DatumType.Float]: "float",
  [DatumType.Float32]: "f32",
  [DatumType.Float64]: "f64",
  [DatumType.Integer]: "int",
  [DatumType.Int8]: "i8",
  [DatumType.Int16]: "i16",
  [DatumType.Int32]: "i32",
  [DatumType.Int64]: "i64",
  [DatumType.Function]: "func",
  [DatumType.String]: "str",
  [DatumType.Number]: "num",
  [DatumType.Type]: "type",
  [DatumType.Any]: "any"
} as const;

export const nameToTypeMap = {
  "float": DatumType.Float,
  "f32": DatumType.Float32,
  "f64": DatumType.Float64,
  "int": DatumType.Integer,
  "i8": DatumType.Int8,
  "i16": DatumType.Int16,
  "i32": DatumType.Int32,
  "i64": DatumType.Int64,
  "func": DatumType.Function,
  "str": DatumType.String,
  "num": DatumType.Number,
  "type": DatumType.Type,
  "object": DatumType.Object,
  "array": DatumType.Array,
  "any": DatumType.Any
} as const;
