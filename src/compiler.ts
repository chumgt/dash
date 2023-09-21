import { DashError } from "./error.js";
import { Node } from "./node.js";

export interface Compiler<T = any> {
  compile(node: Node): T;
}

export class DashCompileError extends DashError { }
