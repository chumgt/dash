
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

export class Value {
  type: Type;
  data: any;

  public constructor(type: Type, data: any) {
    this.type = type;
    this.data = data;
  }
}

export class Func extends Value {
  public constructor(data: any) {
    super(Type.Function, data);
  }
}
