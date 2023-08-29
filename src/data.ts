import { Value } from "./value";

export type NativeFunction =
    (...args: Value[]) => Value | never;

// export interface Datum {
//   type: Type;
//   value: any;
// }

export const enum Type {
  Number = 1 << 0,
  String = 1 << 1,
  Function = 1 << 2,
  Type = 1 << 3,

  Any = Function | Number | String | Type,
  Undefined = 0
}
