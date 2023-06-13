
export interface Data {}

export class Number {
  // public static readonly INFINITY: NumberToken;
}

export enum Type {
  Number = 1 << 0,
  String = 1 << 1,
  Function = 1 << 2,

  Any = Function | Number | String,
  Undefined = 0
}
