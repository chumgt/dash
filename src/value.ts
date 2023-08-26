import { Type, Value } from "./data";
import { DashError } from "./error";
import { BinaryOpKind } from "./expression";

export class ValueType {
  public operators: Partial<Record<BinaryOpKind, (arg: Value) => Value>>;

  public constructor() {
    this.operators = { };
  }
}

// export class StringType extends ValueType {
//   constructor() {
//     super();
//     this.operators[BinaryOpKind.Concat] = (arg: Value) => {
//       if (arg.type !== )
//     };
//   }
// }

// export class Value {
//   public readonly type: Type;
//   public constant?: boolean;
//   public writable?: boolean;

//   public context?: any;
//   public properties: Record<string, Value>;
//   private _data: any;

//   public constructor(type: Type, data: any) {
//     this.type = type;
//     this.data = data;
//     this.constant = false;
//     this.properties = { };
//   }

//   public get data() { return this._data }
//   public set data(value: any) {
//     if (value === undefined || value === null)
//       throw new DashError("null value");
//     this._data = value;
//   }

//   public cast(type: Type): Value | never {
//     if (this.type === type)
//       return this;

//     switch (this.type) {
//       case Type.Number:
//         if (type === Type.String)
//           return new Value(type, String(this.data));
//         break;
//       case Type.String:
//         if (type === Type.Number)
//           return new Value(type, Number(this.data));
//         break;
//     }

//     throw new DashError("cannot cast "+this.type+" to "+type);
//   }

//   public native?(...args: Value[]);

//   public toString(): string {
//     return `[${this.type} ${this.data}]`;
//   }
// }

// export function cast(value: Value, to: Type): Value {

// }
