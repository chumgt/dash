import { Expression } from "./expression";
import { FunctionValue, Value } from "./vm/value";

export interface CallContext {
  target: Value;
  arguments: Value[];
}

export interface FunctionParameter {
  name?: string;
}

export interface FunctionSignature {
  name?: string;
  params: FunctionParameter[];
}

// export class FunctionOverloads {
//   protected readonly impls: Map<FunctionSignature, Expression>;

//   public constructor(impls?: Map<FunctionSignature, Expression>) {
//     this.impls = impls ?? new Map();
//   }

//   public getMatch(): FunctionValue {
//     // new FunctionValue()
//   }
// }
