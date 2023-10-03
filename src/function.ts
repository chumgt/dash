import { Type } from "./type.js";

export interface FnArgument {
  type: Type;
}

export interface FnParameter {
  name: string;
  type: Type;
}

export type FnArguments = FnArgument[];
export type FnParameters = FnParameter[];

export interface FnSignature {
  name?: string;
  params: FnParameters;
}
